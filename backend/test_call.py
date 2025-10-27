# test_call.py
import requests, json
payload = json.load(open("payload.llm.json"))
r = requests.post("http://localhost:8787/analyze",
                  headers={"Content-Type":"application/json"},
                  data=json.dumps(payload))
print(r.status_code)
print(r.json())
