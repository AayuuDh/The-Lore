from model2vec import StaticModel
_model = StaticModel.from_pretrained("minishlab/potion-base-8M")

def embed(text: str) -> list[float]:
    return _model.encode(text).tolist()

def embed_batch(texts: list[str]) -> list[list[float]]:
    return _model.encode(texts).tolist()