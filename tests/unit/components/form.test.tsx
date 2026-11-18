import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, Field, Input } from '@/components/ui'

describe('form primitives', () => {
  it('renders the default leaf button and the coin variant', () => {
    expect(renderToStaticMarkup(<Button>Nạp điểm</Button>)).toContain('bg-primary')
    expect(renderToStaticMarkup(<Button variant="coin">Đổi quà</Button>)).toContain('bg-coin')
  })

  it('marks a loading button busy and disabled', () => {
    const html = renderToStaticMarkup(<Button loading>Đang lưu</Button>)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled')
  })

  it('passes a single child through when asChild is set', () => {
    const html = renderToStaticMarkup(
      <Button asChild>
        <a href="/register">Đăng ký</a>
      </Button>
    )
    expect(html).toContain('href="/register"')
    expect(html).toContain('Đăng ký')
  })

  it('marks an invalid input', () => {
    expect(renderToStaticMarkup(<Input invalid />)).toContain('aria-invalid="true"')
  })

  it('renders a field error as an alert', () => {
    expect(
      renderToStaticMarkup(
        <Field label="Email" error="Email không hợp lệ">
          <Input />
        </Field>
      )
    ).toContain('role="alert"')
  })
})
