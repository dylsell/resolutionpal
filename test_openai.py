import openai
import os
from dotenv import load_dotenv

load_dotenv()

# Get and print API key (first few chars)
api_key = os.getenv('OPENAI_API_KEY')
print(f"API Key starts with: {api_key[:10]}")

# Configure OpenAI
openai.api_key = api_key

try:
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say hello!"}]
    )
    print("Success!")
    print(completion.choices[0].message['content'])
except Exception as e:
    print(f"Error: {str(e)}") 