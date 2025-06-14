'use client'

import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signature: string) => void
  title?: string
  description?: string
}

export default function SignatureModal({ 
  isOpen, 
  onClose, 
  onSave, 
  title = "Digital Signature",
  description = "Please sign below to confirm your timesheet submission."
}: SignatureModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  if (!isOpen) return null

  const handleClear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
  }

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const signature = sigCanvas.current.toDataURL()
      onSave(signature)
      onClose()
    }
  }

  const handleBegin = () => {
    setIsEmpty(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {title}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {description}
              </p>
              
              {/* Signature Canvas */}
              <div className="border-2 border-gray-300 border-dashed rounded-lg p-2 mb-4">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: 'signature-canvas w-full h-48 bg-white rounded'
                  }}
                  onBegin={handleBegin}
                />
              </div>
              
              <div className="text-xs text-gray-400 text-center mb-4">
                Sign above using your mouse, trackpad, or touch screen
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSave}
              disabled={isEmpty}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Signature
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 