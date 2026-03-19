import React from 'react'

export const BeforeLogin: React.FC = () => {
  return (
    <div>
      <p>
        <b>Welcome to Framehouse Hub!</b>
        {' This is where site admins and creatives will log in to manage assets. Clients can '}
        <a href={`/login`}>log in to the gallery instead</a>
        {' to access their high-resolution photos.'}
      </p>
    </div>
  )
}
