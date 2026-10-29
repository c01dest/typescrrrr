import { Router, Request, Response, NextFunction } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { MulterError } from 'multer'
import { uploadAvatar, uploadDocuments, uploadToMemory } from '../middleware/upload'

const router = Router()

function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Превышено максимальное количество файлов' })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Неожиданное поле файла' })
    }
  }
  if (err instanceof Error) {
    return res.status(400).json({ error: err.message })
  }
  next(err)
}

// 1. Аватар
router.post('/avatar', uploadAvatar.single('avatar'), handleUploadError, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' })
  }

  res.status(201).json({
    message: 'Аватар загружен',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/avatars/${req.file.filename}`
    }
  })
})

// 2. Документы
router.post('/documents', uploadDocuments.array('documents', 5), handleUploadError, (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Файлы не загружены' })
  }

  const result = files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    url: `/uploads/documents/${file.filename}`
  }))

  res.status(201).json({
    message: `Загружено файлов: ${result.length}`,
    files: result
  })
})

// 3. Профиль
interface ProfileBody {
  name?: string
  bio?: string
}

router.post(
  '/profile',
  uploadAvatar.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  handleUploadError,
  (req: Request, res: Response) => {
    const { name, bio } = req.body as ProfileBody
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    const avatar = files?.avatar?.[0]
    const cover = files?.cover?.[0]

    if (!name) {
      return res.status(400).json({ error: 'Поле name обязательно' })
    }

    res.status(201).json({
      message: 'Профиль обновлён',
      profile: {
        name,
        bio: bio || '',
        avatar: avatar ? `/uploads/avatars/${avatar.filename}` : null,
        cover: cover ? `/uploads/avatars/${cover.filename}` : null
      }
    })
  }
)

// 4. Загрузка в память
router.post('/image/process', uploadToMemory.single('image'), handleUploadError, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' })
  }

  const base64 = req.file.buffer.toString('base64')

  res.json({
    message: 'Файл получен в памяти',
    size: req.file.size,
    preview: `data:${req.file.mimetype};base64,${base64.substring(0, 50)}...`
  })
})

// 5. Удаление файла с типизацией параметров
router.delete('/:folder/:filename', async (req: Request<{ folder: string; filename: string }>, res: Response, next: NextFunction) => {
  const { folder, filename } = req.params

  if (!folder || !filename) {
    return res.status(400).json({ error: 'Не указаны параметры пути' })
  }

  const allowedFolders: string[] = ['avatars', 'documents']

  if (!allowedFolders.includes(folder)) {
    return res.status(400).json({ error: 'Недопустимая папка' })
  }

  const safeName = path.basename(filename)
  const filePath = path.join('uploads', folder, safeName)

  try {
    await fs.unlink(filePath)
    res.json({ message: 'Файл удалён' })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return res.status(404).json({ error: 'Файл не найден' })
    }
    next(err)
  }
})

export const filesRouter = router