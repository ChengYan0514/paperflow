import pandas as pd
import json
import os
import yaml
from pathlib import Path


def run(stage0_outputs_path, csv_path, output_base, max_papers=15000):
    paper_map={}
    with open(stage0_outputs_path,"r",encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            data=json.loads(line)
            paper_id=str(data["paper_id"]).strip()
            relevant_ids=set(map(str,data.get("relevant_block_ids",[])))
            paper_map[paper_id]=relevant_ids

    print(f"[INFO] loaded papers: {len(paper_map)}")

    df=pd.read_csv(csv_path)
    df["block_id"]=df["block_id"].astype(str).str.strip()
    df["work_id"]=df["work_id"].astype(str).str.strip()

    csv_name=os.path.splitext(os.path.basename(csv_path))[0]
    output_dir=os.path.join(output_base,csv_name)
    Path(output_dir).mkdir(parents=True,exist_ok=True)

    papers=list(df.groupby("work_id"))[:max_papers]
    print(f"[INFO] processing {len(papers)} papers")

    for work_id,sub_df in papers:
        sub_df=sub_df.copy().reset_index(drop=True)

        relevant_ids=paper_map.get(work_id,set())
        no_stage0=len(relevant_ids)==0

        if no_stage0:
            print(f"! {work_id}: no stage0 data → FULL relevant")

        n=len(sub_df)
        relevant_flags=[False]*n

        if no_stage0:
            for i in range(n):
                if sub_df.loc[i,"block_type"]!="discarded":
                    relevant_flags[i]=True

        else:
            title_indices=sub_df[sub_df["block_type"]=="title"].index.tolist()

            for i,idx in enumerate(title_indices):
                block_id=sub_df.loc[idx,"block_id"]
                if block_id in relevant_ids:
                    start=idx
                    end=title_indices[i+1] if i+1<len(title_indices) else n
                    for j in range(start,end):
                        if sub_df.loc[j,"block_type"]!="discarded":
                            relevant_flags[j]=True

            intro_start=None
            for i in range(n):
                if sub_df.loc[i,"title_level"]==0:
                    intro_start=i
                    break

            if intro_start is not None:
                intro_end=n
                for idx in title_indices:
                    if idx>intro_start:
                        intro_end=idx
                        break

                for j in range(intro_start,intro_end):
                    if sub_df.loc[j,"block_type"]!="discarded":
                        relevant_flags[j]=True

        sub_df["relevant"]=relevant_flags

        final_text=sub_df[sub_df["relevant"]]["block_text"].tolist()

        if not final_text:
            print(f"✗ {work_id}: empty")
            continue

        output_file=os.path.join(output_dir,f"{work_id}.txt")

        with open(output_file,"w",encoding="utf-8") as f:
            for t in final_text:
                if pd.notna(t):
                    f.write(str(t)+"\n")

        print(f"✓ {work_id}: {len(final_text)} lines")

    print("🎉 DONE: stage1 generation completed!")
    return output_dir


if __name__=="__main__":
    with open("config.yaml","r",encoding="utf-8") as f:
        config=yaml.safe_load(f)

    cfg=config["stage1_prepare"]

    run(
        cfg["stage0_outputs_path"],
        cfg["csv_path"],
        cfg["output_base"],
        cfg.get("max_papers",15000)
    )