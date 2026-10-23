export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'slate',
    },
    // Lớp kính của thẻ. Khai qua slot của Nuxt UI chứ KHÔNG dùng selector
    // [data-slot="root"] trong CSS: attribute đó dùng chung cho gần như mọi
    // component (FormField, Input, Checkbox...), nhắm vào nó sẽ blur từng ô nhập.
    // Định nghĩa của .glass-card ở main.css.
    card: {
      slots: {
        root: 'glass-card',
      },
    },
    // Popup của USelect / USelectMenu portal vào body với z-index auto, bị bottom
    // sheet (z-[200]) che mất → đẩy lên z-[300].
    select: {
      slots: {
        content: 'z-[300]',
      },
    },
    selectMenu: {
      slots: {
        content: 'z-[300]',
      },
    },
  },
})
