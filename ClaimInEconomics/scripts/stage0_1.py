import os
import glob
import json
import pandas as pd


def run(input_dir, output_dir):
    """
    CSV -> stage0 json input

    return: output_dir
    """

    os.makedirs(output_dir, exist_ok=True)

    files = sorted(
        glob.glob(os.path.join(input_dir, "*.csv"))
    )

    print(f"发现 {len(files)} 个CSV文件")

    for file_path in files:

        file_name = os.path.splitext(
            os.path.basename(file_path)
        )[0]

        file_output_dir = os.path.join(
            output_dir,
            file_name
        )

        os.makedirs(
            file_output_dir,
            exist_ok=True
        )

        df = pd.read_csv(file_path)

        required_cols = [
            'block_id',
            'work_id',
            'block_type',
            'block_text',
            'title_level'
        ]

        for col in required_cols:
            if col not in df.columns:
                raise ValueError(
                    f"{file_path} 缺少列: {col}"
                )

        df = df[
            df['block_type'].isin(
                ['title', 'text']
            )
        ].reset_index(drop=True)

        indices = []

        for i in range(len(df)):
            if pd.notna(df.loc[i, 'title_level']):
                indices.append(i)
                if i < len(df)-1:
                    indices.append(i+1)

        df = df.loc[
            sorted(set(indices)),
            required_cols
        ].reset_index(drop=True)

        df['block_id'] = df['block_id'].astype(str)

        for work_id, group in df.groupby("work_id"):

            group = group.reset_index(drop=True)

            titles = group[
                (group['title_level'] == 0)
                &
                group['block_text'].notna()
            ]

            paper_title = (
                titles.iloc[0]['block_text']
                if not titles.empty
                else "Unknown_Paper"
            )

            blocks = []

            for i in range(len(group)):
                current = group.loc[i]

                if (
                    pd.notna(current['title_level'])
                    and current['title_level'] >= 1
                ):

                    item = {
                        "block_id": current['block_id'],
                        "title": current['block_text'],
                        "sub_firstblock": ""
                    }

                    if i + 1 < len(group):
                        item["sub_firstblock"] = (
                            group.loc[i+1]['block_text']
                        )

                    blocks.append(item)

            result = {
                "paper_title": paper_title,
                "block_set": blocks
            }

            with open(
                os.path.join(
                    file_output_dir,
                    f"{work_id}.json"
                ),
                "w",
                encoding="utf-8"
            ) as f:
                json.dump(
                    result,
                    f,
                    ensure_ascii=False,
                    indent=2
                )

    return output_dir


if __name__ == "__main__":
    import yaml
    with open("config.yaml","r",encoding="utf-8") as f:
        config = yaml.safe_load(f)

    run(
        input_dir=config["stage0_prepare"]["input_dir"],
        output_dir=config["stage0_prepare"]["output_dir"]
    )