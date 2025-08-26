/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './packages/ui/**/*.{js,ts,jsx,tsx}',
    './apps/**/*.{js,ts,jsx,tsx}',
    './apps/web/app/**/*.{js,ts,jsx,tsx}',
    './apps/web/src/**/*.{js,ts,jsx,tsx}',
    '!./packages/**/node_modules/**',
    '!./packages/**/dist/**'
  ],
  safelist: [
    'bg-warning','bg-success','bg-danger','animate-shimmer','bg-info','bg-brand-50','bg-brand-500','bg-brand-600','bg-brand-700','text-brand-600','border-brand-500',
    // Responsive grid columns
    'grid-cols-1',
    'grid-cols-3',
    'sm:grid-cols-3',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'lg:grid-cols-3',
    // Responsive max widths
    'max-w-full',
    'sm:max-w-2xl',
    'md:max-w-3xl',
    'lg:max-w-4xl',
    'xl:max-w-5xl',
    // Responsive heights
    'h-full',
    'sm:h-auto',
    'sm:max-h-[85vh]',
    'md:max-h-[90vh]',
    // Responsive padding
    'p-2',
    'p-3',
    'sm:p-3',
    'sm:p-5',
    'md:p-4',
    'lg:p-5',
    'lg:p-8',
    'px-0',
    'px-2',
    'px-4',
    'sm:px-4',
    'sm:px-6',
    'lg:px-8',
    'py-1',
    'py-2',
    'sm:py-1.5',
    'sm:py-3',
    // Responsive margins
    'mx-0',
    'sm:mx-4',
    'md:mx-6',
    'lg:mx-8',
    'sm:ml-10',
    'sm:mt-1',
    // Responsive border radius
    'rounded-none',
    'sm:rounded-2xl',
    // Responsive text sizes
    'text-xs',
    'text-lg',
    'sm:text-sm',
    'sm:text-xl',
    // Responsive spacing
    'space-y-2',
    'sm:space-y-3',
    'gap-1',
    'gap-2',
    'gap-4',
    'sm:gap-0',
    'sm:gap-2',
    'sm:gap-5',
    'lg:gap-6',
    // Responsive display
    'hidden',
    'sm:inline',
    'sm:hidden',
    'flex-wrap',
    'sm:flex-nowrap',
    'flex-col',
    'sm:flex-row',
    // Responsive icon sizes
    'w-3',
    'h-3',
    'sm:w-4',
    'sm:h-4',
    // Gap utilities
    'gap-x-4',
    'gap-x-6',
    'gap-x-10',
    'sm:gap-x-6',
    'lg:gap-x-10',
    // Dynamic classes
    'shadow-inner',
    'shadow-lg',
    'hover:shadow-xl',
    'border-2',
    'border-gray-300',
    'bg-white',
    'text-brand-accent',
    'ml-10',
    'mt-1',
    'mb-0.5',
    'mb-1',
    'space-y-1',
    'space-y-1.5',
    'p-2.5',
    'pr-10',
    'right-[30px]',
    'bg-[#FBF9F5]',
    'hover:bg-[#F5F2EC]'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
          primary: 'var(--color-brand-primary)',
          accent: 'var(--color-brand-accent)',
          focus: 'var(--color-brand-focus)'
        },
        gray: {
          0: 'var(--color-gray-0)',
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)'
        },
        success: 'var(--color-semantic-success)',
        warning: 'var(--color-semantic-warning)',
        danger: 'var(--color-semantic-danger)',
        info: 'var(--color-semantic-info)',
        'surface-header': 'var(--color-surface-header)',
        'surface-side': 'var(--color-surface-side)',
        'canvas-base': 'var(--color-canvas-base)',
        'canvas-grid': 'var(--color-canvas-grid)',
        'flow-connector': 'var(--color-flow-connector)',
        'flow-node-border': 'var(--color-flow-node-border)',
        'flow-node-bg': 'var(--color-flow-node-bg)',
        'sidebar-bg': 'var(--color-sidebar-bg)',
        'sidebar-icon': 'var(--color-sidebar-icon)',
        'sidebar-text': 'var(--color-sidebar-text)',
        'sidebar-text-active': 'var(--color-sidebar-text-active)',
        'sidebar-activeItem': 'var(--color-sidebar-active-item)',
        'header-bg': 'var(--color-header-bg)',
        'header-icon': 'var(--color-header-icon)',
        'header-iconHover': 'var(--color-header-icon-hover)',
        'header-iconActive': 'var(--color-header-icon-active)',
        'header-tabBg': 'var(--color-header-tab-bg)',
        'header-tabActive': 'var(--color-header-tab-active)',
        header: 'var(--color-surface-header)',
        side: 'var(--color-surface-side)',
        canvas: 'var(--color-canvas-base)',
        border: 'var(--color-border-round)'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        'dot': '20px',
        header: '48px',
        '56': '14rem' // logo width
      },
      height: {
        header: '48px'
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        shell: '12px',        // header & sidebar outer shell
        pill: '0.875rem',     // 14px tab pill
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,.05)',
        md: '0 3px 6px rgba(0,0,0,.08)',
        lg: '0 10px 20px rgba(0,0,0,.1)',
        xl: '0 20px 40px rgba(0,0,0,.15)',
        'node': '0 3px 6px rgba(0,0,0,.08)',
        'nodeHover': '0 6px 12px rgba(0,0,0,.08)',
        'tab': '0 -1px 0 0 rgba(255,255,255,.15)'
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        heading: ['var(--font-sans)'],
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace']
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }]    // 36px
      },
      ringColor: {
        brand: {
          500: 'var(--color-brand-500)'
        }
      },
      animation: {
        'fade-in': 'fadeIn 250ms ease-out',
        'fade-out': 'fadeOut 250ms ease-in',
        'slide-in': 'slideIn 250ms ease-out',
        'slide-out': 'slideOut 250ms ease-in',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' }
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060'
      },
      transitionDuration: {
        '100': '100ms',
        '250': '250ms',
        '400': '400ms'
      }
    }
  },
  plugins: []
};
