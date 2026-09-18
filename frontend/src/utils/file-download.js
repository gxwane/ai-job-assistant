/**
 * 文件下载与流式导出工具函数
 */

/**
 * 将 Blob 数据触发为浏览器下载
 * @param {Blob|ArrayBuffer} data - 二进制数据
 * @param {string} filename - 保存的文件名
 * @param {string} [mimeType] - 可选的 MIME 类型
 */
export function downloadBlob(data, filename = 'download', mimeType = 'application/octet-stream') {
  if (!data) {
    throw new Error('No data provided for download')
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename

  document.body.appendChild(a)
  a.click()

  // 延迟回收 ObjectURL，确保在浏览器触发下载后再撤销
  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 100)
}

/**
 * 触发直接 URL 文件下载
 * @param {string} url - 下载链接
 * @param {string} [filename] - 保存的文件名
 */
export function downloadUrl(url, filename = '') {
  if (!url) {
    throw new Error('URL is required for download')
  }
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  if (filename) {
    a.download = filename
  }
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
  }, 100)
}
