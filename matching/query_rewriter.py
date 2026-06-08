import requests



def rewrite_query(query: str):
    response = requests.post(
    "http://localhost:11434/api/generate",
    json = {
        "model": "llama3.2:3b",
        "prompt": f'''You are rewriting a user's natural-language query
        so it matches descriptions of AI skills. some examples are: Summarize Meeting 
        Notes, Brainstorm Product Ideas, Extract Action Items, Create
          Project Plan. (Those are not comprehensive) Output a short phrase (under 15 words) using 
          simple, concrete workplace language. No explanations, no 
          preamble, just the rewritten phrase. 
          Query: {query} ''',
        "stream": False,
    },
    )
    data = response.json()
    return data["response"]

if __name__ == "__main__":
    test_query = "my brain is super mush and i cant think, i need some kind of tool to dumb down my meetings"
    print(rewrite_query(test_query))