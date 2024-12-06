import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  colors: {
    brand: {
      primary: '#00CFF8',
      secondary: '#010066',
      accent: '#FC306C',
    },
    bg: {
      primary: '#E7E7E7',
      secondary: '#121212',
    }
  },
  styles: {
    global: {
      body: {
        bg: 'bg.primary',
        color: 'bg.secondary'
      }
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'md',
      },
      variants: {
        primary: {
          bg: 'brand.primary',
          color: 'white',
          _hover: {
            bg: 'brand.secondary',
          }
        },
        secondary: {
          bg: 'brand.secondary',
          color: 'white',
          _hover: {
            bg: 'brand.primary',
          }
        }
      },
      defaultProps: {
        variant: 'primary',
      }
    },
    Container: {
      baseStyle: {
        maxW: 'container.xl',
      }
    }
  }
}) 