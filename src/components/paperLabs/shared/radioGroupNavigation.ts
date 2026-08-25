export function getRadioTabIndex(optionIndex: number, selectedIndex: number) {
  return optionIndex === (selectedIndex < 0 ? 0 : selectedIndex) ? 0 : -1
}

export function getRadioTargetIndex(key: string, currentIndex: number, itemCount: number) {
  if (itemCount <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'ArrowRight' || key === 'ArrowDown') return (currentIndex + 1) % itemCount
  return null
}
