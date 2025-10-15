export default async (req, res) => {
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ error: "ID não informado" });
  }

  try {
    // Monta o link direto do Google Drive
    const url = `https://drive.google.com/uc?export=view&id=${id}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ error: "Erro ao acessar imagem do Drive" });
    }

    // Pega o tipo de conteúdo e retorna a imagem binária
    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar imagem", details: error.message });
  }
};
