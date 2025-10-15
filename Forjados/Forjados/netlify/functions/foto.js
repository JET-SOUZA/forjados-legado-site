export async function handler(event) {
  try {
    const id = event.queryStringParameters.id;

    if (!id) {
      return {
        statusCode: 400,
        body: "Parâmetro 'id' é obrigatório. Exemplo: /foto?id=123abc"
      };
    }

    const driveUrl = `https://drive.google.com/uc?export=view&id=${id}`;
    const response = await fetch(driveUrl);

    if (!response.ok) {
      return {
        statusCode: 404,
        body: "Imagem não encontrada no Google Drive."
      };
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: { "Content-Type": contentType },
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: "Erro interno: " + error.message
    };
  }
}
