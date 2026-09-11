// Redimensiona/comprime uma imagem antes de guardá-la (evita estourar a
// cota do localStorage com fotos grandes tiradas direto da câmera).
export function lerImagemComprimida(
  file: File,
  tamanhoMax = 320,
  qualidade = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(leitor.error)
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
      img.onload = () => {
        const escala = Math.min(1, tamanhoMax / Math.max(img.width, img.height))
        const largura = Math.round(img.width * escala)
        const altura = Math.round(img.height * escala)

        const canvas = document.createElement('canvas')
        canvas.width = largura
        canvas.height = altura
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(leitor.result))
          return
        }
        ctx.drawImage(img, 0, 0, largura, altura)
        resolve(canvas.toDataURL('image/jpeg', qualidade))
      }
      img.src = String(leitor.result)
    }
    leitor.readAsDataURL(file)
  })
}
