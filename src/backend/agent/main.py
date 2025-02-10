from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, BaseSettings
from typing import List, Optional
import httpx
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import os

# Environment variable configuration
class Settings(BaseSettings):
    searxng_url: str = os.getenv("SEARXNG_URL", "http://localhost:8080/search")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL")

settings = Settings()

app = FastAPI()

# Request model (compatible with OpenAI format)
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[Message]
    model: str = "deepseek-chat"
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.7

# SearXNG search handler
async def search_searxng(query: str) -> str:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                settings.searxng_url,
                params={"q": query, "format": "json"}
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            return "\n\n".join([
                f"{result.get('title', '')}\n{result.get('content', result.get('snippet', ''))}"
                for result in results
            ])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# Use LLM to determine if a search is needed
async def should_search(user_message: str) -> bool:
    llm = ChatOpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        model="deepseek-chat",
        temperature=0.2  # Low temperature for stable judgment
    )
    prompt = SystemMessage(content="You are an AI assistant responsible for determining whether a user's question requires an internet search. Respond with only 'yes' or 'no'.")
    user_prompt = HumanMessage(content=f"Question: {user_message}")
    response = await llm.agenerate([[prompt, user_prompt]])
    return response.generations[0][0].text.strip().lower() == "yes"

# OpenAI-compatible response format
def format_response(content: str) -> dict:
    return {
        "object": "chat.completion",
        "choices": [{
            "message": {
                "role": "assistant",
                "content": content
            }
        }]
    }

@app.post("/v1/chat/completions")
async def chat_completion(request: ChatCompletionRequest):
    # Extract user message
    user_message = next(
        (msg.content for msg in request.messages if msg.role == "user"), 
        None
    )
    if not user_message:
        raise HTTPException(status_code=400, detail="No user message found")

    # Use LLM to determine if a search is needed
    context = ""
    if await should_search(user_message):
        try:
            context = await search_searxng(user_message)
        except Exception as e:
            return format_response(f"Failed to perform a web search. Attempting to answer directly. Error: {str(e)}")

    # Construct the prompt
    prompt = SystemMessage(content="You are a helpful AI assistant. Answer the user's question based on the following context.") 
    if context:
        prompt.content += f"\n\n【Search Context】\n{context}"
    user_prompt = HumanMessage(content=f"Question: {user_message}")

    # Call the LLM to generate a response
    try:
        llm = ChatOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        response = await llm.agenerate([[prompt, user_prompt]])
        return format_response(response.generations[0][0].text)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Model service error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)