import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { Request } from 'express'

// Автосоздание директорий при запуске
const uploadDirs = ['uploads/avatars', 'uploads/documents', 'uploads/temp']
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// DiskStorage для аватарок
const avatarStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/avatars')
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// DiskStorage для документов
const documentStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/documents')
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const timestamp = Date.now()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${timestamp}_${safeName}`)
  }
})

// В память
const memoryStorage = multer.memoryStorage()

// Фильтры форматов
const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Разрешены только изображения: JPEG, PNG, WebP, GIF'))
  }
}

const documentFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Разрешены только документы: PDF, DOC, DOCX, TXT, CSV'))
  }
}

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
})

export const uploadDocuments = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
})

export const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})