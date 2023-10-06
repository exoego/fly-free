import { useMemo, type Ref } from 'react'

import style from '~/components/SubmitButton.module.css'
import type { PostStatus } from '~/models/PostStatus'

export type SubmitButtonProps = {
  innerRef: Ref<HTMLButtonElement>
  postStatus: PostStatus
  handleSubmit: () => void
}

export const SubmitButton = ({
  innerRef,
  postStatus,
  handleSubmit,
}: SubmitButtonProps) => {
  const disabled = postStatus.type !== 'Input'
  const label = useMemo(() => {
    switch (postStatus.type) {
      case 'Initialize':
      case 'Input':
        return 'Multipost'
      case 'Process':
        return 'Multiposting'
      case 'Output':
        return 'Multiposted'
    }
  }, [postStatus])

  return (
    <button
      className={style.submit}
      disabled={disabled}
      type="button"
      ref={innerRef}
      onClick={handleSubmit}>
      {label}
    </button>
  )
}
