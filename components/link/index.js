import NextLink from 'next/link'

export const Link = ({ href = '', children, className, style }) => {
  const isExternal = href?.startsWith('http')

  return (
    <NextLink href={href} passHref={isExternal}>
      <a
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        className={className}
        style={style}
      >
        {children}
      </a>
    </NextLink>
  )
}
