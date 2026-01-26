import clsx from 'clsx'
import React from 'react'

type Props = {
  amount: number
  position?: 'bottom' | 'center'
  title: string
}

export const Label: React.FC<Props> = ({ position = 'bottom', title }) => {
  return (
    <div
      className={clsx('absolute bottom-0 left-0 flex w-full px-4 pb-4 @container/label', {
        '': position === 'center',
      })}
    >
      <div className="flex items-end justify-between text-sm grow font-semibold ">
        <h3 className="mr-4 font-mono line-clamp-2 border p-2 px-3 leading-none tracking-tight rounded-full bg-white/70 text-black backdrop-blur-md dark:border-neutral-800 dark:bg-black/70 dark:text-white">
          {title}
        </h3>
      </div>
    </div>
  )
}
