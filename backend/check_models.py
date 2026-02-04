import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ ERROR: Could not find API Key in .env file!")
else:
    genai.configure(api_key=api_key)
    print(f"✅ Key found: {api_key[:5]}... Checking available models...\n")
    
    try:
        found_any = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"🌟 AVAILABLE: {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ No chat models found. Your key might be restricted.")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")