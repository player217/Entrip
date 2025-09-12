import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Input } from '../primitives/Input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Test input" />)
    const input = screen.getByPlaceholderText('Test input')
    expect(input).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="Email" placeholder="Enter email" />)
    const label = screen.getByText('Email')
    expect(label).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input error="This field is required" />)
    const error = screen.getByText('This field is required')
    expect(error).toBeInTheDocument()
    expect(error).toHaveClass('text-danger')
  })

  it('displays hint text', () => {
    render(<Input hint="Enter your full name" />)
    const hint = screen.getByText('Enter your full name')
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveClass('text-gray-500')
  })

  it('disables input when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />)
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
  })

  it('applies correct type attribute', () => {
    render(<Input type="email" placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('type', 'email')
  })
})
