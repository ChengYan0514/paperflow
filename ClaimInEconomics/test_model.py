from openai import OpenAI


client = OpenAI(
    api_key="sk-7fbadbdacdd44748b83bf38f6e17b019",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)


response = client.chat.completions.create(
    model="qwen3.7-flash",
    messages=[
        {
            "role": "user",
            "content": "你好，请回复一句测试"
        }
    ]
)


print(response.choices[0].message.content)