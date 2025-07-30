'use client'

import React, { useRef, useState } from 'react'
import { X } from 'lucide-react'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signature: string) => void
  title?: string
}

export default function SignatureModal({ isOpen, onClose, onSave, title = 'Add Signature' }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  if (!isOpen) return null

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const signatureData = canvas.toDataURL('image/png')
    onSave(signatureData)
    onClose()
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 w-full max-w-md'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        <div className='border-2 border-gray-300 rounded-lg mb-4'>
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className='w-full h-48 cursor-crosshair'
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>

        <div className='flex justify-between'>
          <button
            onClick={clearCanvas}
            className='px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50'
          >
            Clear
          </button>
          <div className='space-x-2'>
            <button
              onClick={onClose}
              className='px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasSignature}
              className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 