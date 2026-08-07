# -*- coding:utf-8 -*-
import json
import yaml
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor,as_completed
from common import get_openai_client

ENUM_RULES={
    "sign_of_impact":["positive","negative","null_effect","u_shaped","ambiguous"],
    "type_of_relationship":["direct effect","indirect effect","confounding","mediation","collider","ancestor","descendant","bidirectional","association","other"],
    "statistical_significance":["p<0.01","0.01<=p<0.05","0.05<=p<0.1","p>0.1","NA"],
    "causal_inference_method":["RDD","DID","RCT","IV","Structural Estimation","Fixed Effects Models","Event Study","Simulation","Matching Methods","Synthetic Controls","VAR","Theoretical/Non-Empirical","Machine Learning Methods","Bayesian Methods","Other","Do not know"]
}
TENTATIVE_VALUES=["certain","tentative"]

def load_config(path):
    with open(path,"r",encoding="utf-8") as f:return yaml.safe_load(f)

def clean_value(x):
    return "" if pd.isna(x) else str(x).strip()

def convert_stage1_to_csv(jsonl_path):
    rows=[]
    with open(jsonl_path,"r",encoding="utf-8") as f:
        for idx,line in enumerate(f):
            if not line.strip():continue
            try:data=json.loads(line)
            except:continue
            paper_id=clean_value(data.get("paper_id",f"paper_{idx}"))
            edges=data.get("edges",[])
            if isinstance(edges,str):
                try:edges=json.loads(edges)
                except:continue
            if not isinstance(edges,list):continue
            for edge in edges:
                if isinstance(edge,str):
                    try:edge=json.loads(edge)
                    except:continue
                if not isinstance(edge,dict):continue
                rows.append({
                    "paper_id":paper_id,
                    "claim":clean_value(edge.get("claim")),
                    "cause":clean_value(edge.get("cause")),
                    "effect":clean_value(edge.get("effect")),
                    "type_of_relationship":clean_value(edge.get("type_of_relationship")),
                    "sign_of_impact":clean_value(edge.get("sign_of_impact")),
                    "is_main_contribution":clean_value(edge.get("is_main_contribution")),
                    "statistical_significance":clean_value(edge.get("statistical_significance")),
                    "causal_inference_method":clean_value(edge.get("causal_inference_method")),
                    "sources_of_exogenous_variation":clean_value(edge.get("sources_of_exogenous_variation")),
                    "level_of_tentativeness":clean_value(edge.get("level_of_tentativeness")),
                    "evidence_method_other_description":clean_value(edge.get("evidence_method_other_description")),
                    "evidence":clean_value(edge.get("evidence"))
                })
    if not rows:raise ValueError("No valid claims found")
    df=pd.DataFrame(rows)
    return df.drop_duplicates(subset=["paper_id","cause","effect","causal_inference_method"])

def call_llm(value,field,cfg,client,model):
    allowed=ENUM_RULES[field]
    last_result=None
    for attempt in range(2):
        if attempt==0:
            prompt=f"""You are a strict taxonomy normalization system.
Field:{field}
Allowed values:{allowed}
Input:{value}
Rules:
1. Output only JSON.
2. Value must be one of allowed values.
3. Do not create new categories.
4. If uncertain output null.
Format:
{{"normalized":"xxx"}}"""
        else:
            prompt=f"""Your previous answer was invalid.
Field:{field}
Input:{value}
Previous answer:{last_result}
Allowed values:{allowed}
Rules:
1. Output only JSON.
2. You must select one value from allowed values.
3. Do not create new categories.
4. If impossible output null.
Format:
{{"normalized":"xxx"}}"""
        res=client.chat.completions.create(
            model=model,
            messages=[
                {"role":"system","content":"Normalize scientific metadata."},
                {"role":"user","content":prompt}
            ],
            temperature=cfg["temperature"],
            max_tokens=cfg["max_tokens"],
            response_format={"type":"json_object"}
        )
        try:
            result=json.loads(res.choices[0].message.content)
            last_result=result.get("normalized")
        except:
            last_result=None
        if last_result in allowed:
            return value,last_result
    if field=="causal_inference_method":
        return value,"Other"
    return value,None

def normalize_field(df, field, cfg, client, model):
    allowed = ENUM_RULES[field]
    # 找出不在枚举范围内的值
    abnormal = df[field].dropna().astype(str)
    abnormal = abnormal[~abnormal.isin(allowed)].unique().tolist() 
    if not abnormal:
        return df 
    # 调用 LLM 做归一化
    mapping = {}
    with ThreadPoolExecutor(max_workers=cfg["max_workers"]) as pool:
        futures = [pool.submit(call_llm, x, field, cfg, client, model) for x in abnormal]
        for f in tqdm(as_completed(futures), total=len(futures), desc=field):
            try:
                k, v = f.result()
                mapping[k] = v
            except Exception as e:
                print("LLM error:", e)
    # 只在处理 causal_inference_method 时保存原始值
    if field == "causal_inference_method":
        original = df[field].copy()
    # 应用映射
    df[field] = df[field].apply(
        lambda x: mapping.get(str(x), x) if pd.notna(x) else None
    )
    # 把仍然不在允许列表中的值强制处理
    df[field] = df[field].apply(
        lambda x: x if (pd.isna(x) or x in allowed) 
                  else ("Other" if field == "causal_inference_method" else None)
    )
    
    # 关键修复点：只对「原本就不在允许列表」的行写入 description
    if field == "causal_inference_method":
        mask = (~original.isin(allowed)) & original.notna()
        df.loc[mask, "evidence_method_other_description"] = original[mask] 
    return df
def clean_boolean(x):
    x=str(x).lower().strip()
    if x=="true":return True
    if x=="false":return False
    return None

def clean_tentative(x):
    return x if x in TENTATIVE_VALUES else None

def run_stage0_34(input_jsonl,output_csv,cfg,client,model):
    df=convert_stage1_to_csv(input_jsonl)
    df["is_main_contribution"]=df["is_main_contribution"].apply(clean_boolean)
    df["level_of_tentativeness"]=df["level_of_tentativeness"].apply(clean_tentative)
    for field,use_llm in cfg["normalize_fields"].items():
        if use_llm:
            df=normalize_field(df,field,cfg,client,model)
    df.to_csv(output_csv,index=False,encoding="utf-8-sig")
    print("saved:",output_csv)

if __name__=="__main__":
    config_path=Path(__file__).resolve().parent.parent/"config.yaml"
    config=load_config(config_path)
    root=Path(config["io"]["project_root"])
    cfg=config["stage0_34"]
    model_type=config["pipeline"]["stage0_34"]["model_type"]
    client=get_openai_client(config,model_type)
    model=config["models"][model_type]["model"]
    run_stage0_34(root/cfg["input_jsonl"],root/cfg["output_csv"],cfg,client,model)
