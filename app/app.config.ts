export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'orange',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: [
          'rounded-full font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-colors'
        ]
      }
    },
    selectMenu: {
      slots: {
        base: [
          'relative group rounded-full inline-flex items-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-75',
          'transition-colors'
        ],
        content: [
          'max-h-60 w-(--reka-select-trigger-width) bg-default shadow-lg rounded-2xl ring ring-default overflow-hidden data-[state=open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-(--reka-select-content-transform-origin) pointer-events-auto flex flex-col',
          'origin-(--reka-combobox-content-transform-origin) w-(--reka-combobox-trigger-width)'
        ]
      }
    }
  }
})
