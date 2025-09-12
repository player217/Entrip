if (typeof window !== 'undefined') {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
  ) {
    void import('@entrip/shared/mocks/browser').then(({ worker }) => {
      worker.start({
        onUnhandledRequest: 'bypass',
      }).then(() => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('MSW enabled')
        }
      })
    })
  }
}

export {}
