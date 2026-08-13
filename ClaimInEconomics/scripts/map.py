import pandas as pd
import numpy as np
import time
import yaml
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
from common import get_openai_client

def load_config(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_embeddings(client, texts, model_name, max_retries, batch_size):
    if not texts:
        return None

    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        for attempt in range(max_retries):
            try:
                response = client.embeddings.create(
                    model=model_name,
                    input=batch,
                    encoding_format="float"
                )

                all_embeddings.extend(
                    item.embedding for item in response.data
                )
                break

            except Exception as e:
                print(f"[MAP] Embedding failed {attempt+1}/{max_retries}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    return None

    return np.array(all_embeddings, dtype=np.float32)


def run(config_path):
    cfg = load_config(config_path)
    mp = cfg["map"]
    model_type = cfg["pipeline"]["map"]["model_type"]
    model_cfg = cfg["models"][model_type]

    client = get_openai_client(cfg,model_type)

    model_name = model_cfg["model"]
    causal_data_path = mp["causal_data_path"]
    standard_terms_path = mp["standard_terms_path"]
    output_path = mp["output_path"]

    batch_size = int(mp.get("batch_size", 4096))
    similarity_batch_size = int(mp.get("similarity_batch_size", 8192))
    max_retries = int(mp.get("max_retries", 3))

    start_time = time.time()

    print("[MAP] Loading standard terms...")
    df_std = pd.read_csv(standard_terms_path)
    std_labels = df_std["label_en"].dropna().unique().tolist()
    print(f"[MAP] Standard labels: {len(std_labels)}")

    print("[MAP] Generating standard embeddings...")
    std_embeddings = get_embeddings(
    client,
    std_labels,
    model_name,
    max_retries,
    batch_size)

    if std_embeddings is None:
        raise RuntimeError("Standard embeddings failed")

    print("[MAP] Loading claims...")
    df = pd.read_csv(causal_data_path, low_memory=False, dtype=str)
    print(f"[MAP] Claims rows: {len(df)}")

    df["cause"] = df["cause"].fillna("unknown").astype(str)
    df["effect"] = df["effect"].fillna("unknown").astype(str)

    unique_entities = list(set(df["cause"].tolist() + df["effect"].tolist()))
    print(f"[MAP] Unique entities: {len(unique_entities)}")

    entity_map = {}
    total_batches = (len(unique_entities) + batch_size - 1) // batch_size

    for i in range(0, len(unique_entities), batch_size):
        batch = unique_entities[i:i + batch_size]
        print(f"[MAP] Embedding entities {i//batch_size+1}/{total_batches}")

        vectors = get_embeddings(
        client,
        batch,
        model_name,
        max_retries,
        batch_size)
        
        if vectors is not None:
            for text, vec in zip(batch, vectors):
                entity_map[text] = vec

    print(f"[MAP] Entity embeddings: {len(entity_map)}")

    def map_column(column):
        labels = []
        scores = []
        total = len(df)

        for i in range(0, total, similarity_batch_size):
            texts = df[column].iloc[i:i + similarity_batch_size].tolist()

            vectors = np.array([
                entity_map.get(t, np.zeros(std_embeddings.shape[1]))
                for t in texts
            ])

            similarities = cosine_similarity(vectors, std_embeddings)
            best_idx = np.argmax(similarities, axis=1)
            best_scores = np.max(similarities, axis=1)

            labels.extend([std_labels[x] for x in best_idx])
            scores.extend(best_scores.tolist())

            print(f"[MAP] {column}: {min(i+similarity_batch_size,total)}/{total}")

        return labels, scores

    print("[MAP] Mapping cause...")
    cause_standard, cause_score = map_column("cause")

    print("[MAP] Mapping effect...")
    effect_standard, effect_score = map_column("effect")

    df["cause_standard"] = cause_standard
    df["cause_score"] = cause_score
    df["effect_standard"] = effect_standard
    df["effect_score"] = effect_score

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"[MAP] Saved: {output_path}")
    print(f"[MAP] Finished in {(time.time()-start_time)/60:.2f} min")

    return str(output_path)


if __name__ == "__main__":
    run("config.yaml")