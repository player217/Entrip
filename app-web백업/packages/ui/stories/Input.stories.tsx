import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '../primitives/Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '폼 입력을 위한 Input 컴포넌트입니다. 다양한 타입과 상태를 지원합니다.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: '입력 필드 타입',
    },
    label: {
      control: 'text',
      description: '레이블 텍스트',
    },
    placeholder: {
      control: 'text',
      description: '플레이스홀더 텍스트',
    },
    error: {
      control: 'text',
      description: '에러 메시지',
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 상태',
    },
    required: {
      control: 'boolean',
      description: '필수 입력 여부',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: '텍스트를 입력하세요',
  },
}

export const WithLabel: Story = {
  args: {
    label: '이메일',
    type: 'email',
    placeholder: 'example@entrip.co.kr',
  },
}

export const Required: Story = {
  args: {
    label: '팀명',
    placeholder: '팀 이름을 입력하세요',
    required: true,
  },
}

export const WithHint: Story = {
  args: {
    label: '비밀번호',
    type: 'password',
    placeholder: '8자 이상 입력하세요',
    hint: '영문, 숫자, 특수문자를 포함해야 합니다',
  },
}

export const WithError: Story = {
  args: {
    label: '이메일',
    type: 'email',
    placeholder: 'example@entrip.co.kr',
    error: '올바른 이메일 형식이 아닙니다',
    defaultValue: 'invalid-email',
  },
}

export const Disabled: Story = {
  args: {
    label: '수정 불가',
    placeholder: '비활성화된 입력 필드',
    disabled: true,
    defaultValue: '수정할 수 없습니다',
  },
}

export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: '검색어를 입력하세요',
    label: '프로젝트 검색',
  },
}

export const NumberInput: Story = {
  args: {
    type: 'number',
    label: '인원수',
    placeholder: '0',
    min: 0,
    max: 100,
  },
}

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input
        label="팀명"
        placeholder="팀 이름을 입력하세요"
        required
      />
      <Input
        label="출발지"
        placeholder="출발 도시"
      />
      <Input
        label="목적지"
        placeholder="도착 도시"
      />
      <Input
        type="number"
        label="인원수"
        placeholder="0"
        min={1}
        max={100}
      />
      <Input
        type="email"
        label="담당자 이메일"
        placeholder="manager@entrip.co.kr"
        hint="예약 확인서를 받을 이메일 주소"
      />
    </div>
  ),
}
