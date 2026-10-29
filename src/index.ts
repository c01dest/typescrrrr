import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import { filesRouter } from './routes/files'

const app = express()
app.use(express.json())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/upload', filesRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

const PORT = 3000
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`))