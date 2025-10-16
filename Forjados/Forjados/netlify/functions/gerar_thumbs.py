import os
from PIL import Image
import json

# Caminhos relativos da função até a pasta de fotos
PASTA_FOTOS = "../../fotos"
PASTA_THUMBS = "../../fotos/thumbs"

# Cria a pasta de miniaturas caso não exista
os.makedirs(PASTA_THUMBS, exist_ok=True)

# Lista apenas arquivos de imagem
imagens = [f for f in os.listdir(PASTA_FOTOS) if f.lower().endswith((".jpg", ".jpeg", ".png"))]

# Tamanho das miniaturas
TAMANHO = (200, 200)  # você pode alterar para outro tamanho

# Criar miniaturas
for img_nome in imagens:
    caminho_imagem = os.path.join(PASTA_FOTOS, img_nome)
    caminho_thumb = os.path.join(PASTA_THUMBS, img_nome)
    
    with Image.open(caminho_imagem) as img:
        img.thumbnail(TAMANHO)
        img.save(caminho_thumb)

# Retorna JSON com status
def handler(event, context):
    return {
        "statusCode": 200,
        "body": json.dumps({
            "mensagem": "Miniaturas geradas com sucesso!",
            "quantidade": len(imagens)
        })
    }
