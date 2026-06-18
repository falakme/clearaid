from fastapi import FastAPI, File, UploadFile, Form
from fastapi.testclient import TestClient

app = FastAPI()

@app.post("/test")
async def test_endpoint(
    text: str = Form(default=None),
    files: list[UploadFile] = File(default=[])
):
    return {"text": text, "files": len(files)}

client = TestClient(app)

# Test 1: Send both text and files
response1 = client.post("/test", data={"text": "hello"}, files=[("files", ("test.txt", b"test"))])
print("Test 1 (with files):", response1.status_code, response1.json() if response1.status_code == 200 else response1.text)

# Test 2: Send only text
response2 = client.post("/test", data={"text": "hello"})
print("Test 2 (no files):", response2.status_code, response2.json() if response2.status_code == 200 else response2.text)
