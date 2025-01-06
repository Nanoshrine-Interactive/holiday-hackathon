import React from 'react'

export interface ProfileFormData {
  handle: string
  name: string
  bio: string
  picture: File | null
}

interface ProfileFormProps {
  data: ProfileFormData
  onChange: (data: ProfileFormData) => void
  isSubmitting: boolean
  hideHandle?: boolean
}

export function ProfileFormFields({ data, onChange, isSubmitting, hideHandle = false }: ProfileFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onChange({ ...data, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange({ ...data, picture: file })
  }

  return (
    <div className="space-y-4">
      {!hideHandle && (
        <div>
          <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
            Handle
          </label>
          <input
            type="text"
            id="handle"
            name="handle"
            value={data.handle}
            onChange={handleChange}
            placeholder="your-handle"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isSubmitting}
            required
          />
          <p className="mt-1 text-xs text-gray-500">This will be your unique identifier on Lens</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Display Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={data.name}
          onChange={handleChange}
          placeholder="Your Name"
          className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={data.bio}
          onChange={handleChange}
          placeholder="Tell us about yourself"
          rows={3}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="picture" className="block text-sm font-medium text-gray-700 mb-1">
          Profile Picture
        </label>
        <input
          type="file"
          id="picture"
          name="picture"
          onChange={handleFileChange}
          accept="image/*"
          className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>
    </div>
  )
}
