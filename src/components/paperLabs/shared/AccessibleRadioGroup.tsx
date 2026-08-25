import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { getRadioTabIndex, getRadioTargetIndex } from './radioGroupNavigation'

type RadioValue = string | number

type RadioOption<Value extends RadioValue> = {
  key: string | number
  value: Value
}

export function AccessibleRadioGroup<Value extends RadioValue>({
  ariaLabel,
  className,
  options,
  selected,
  onSelect,
  getOptionClassName,
  renderOption,
}: {
  ariaLabel: string
  className: string
  options: readonly RadioOption<Value>[]
  selected: Value | null
  onSelect: (value: Value) => void
  getOptionClassName: (option: RadioOption<Value>, isSelected: boolean) => string
  renderOption: (option: RadioOption<Value>, index: number) => ReactNode
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = options.findIndex((option) => option.value === selected)

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const targetIndex = getRadioTargetIndex(event.key, currentIndex, options.length)
    if (targetIndex === null) return
    event.preventDefault()
    onSelect(options[targetIndex].value)
    optionRefs.current[targetIndex]?.focus()
  }

  return (
    <div className={className} role='radiogroup' aria-label={ariaLabel}>
      {options.map((option, index) => {
        const isSelected = selected === option.value
        return (
          <button
            aria-checked={isSelected}
            className={getOptionClassName(option, isSelected)}
            key={option.key}
            onClick={() => onSelect(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(node) => { optionRefs.current[index] = node }}
            role='radio'
            tabIndex={getRadioTabIndex(index, selectedIndex)}
            type='button'
          >
            {renderOption(option, index)}
          </button>
        )
      })}
    </div>
  )
}
