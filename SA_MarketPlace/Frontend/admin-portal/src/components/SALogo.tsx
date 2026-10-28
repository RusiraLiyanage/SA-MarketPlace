import { CheckSquareFilled } from '@ant-design/icons'
import { Typography } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

interface Props {
  /** The small capitals under the name: which part of the portal this is. */
  line: string
}

// The marketplace mark with SA Admin's purple: a check square, the app name and where you are.
const SALogo = ({ line }: Props) => (
  <Brand to={PATHS.suppliers}>
    <Mark />
    <div>
      <Name>Sample Assist Marketplace</Name>
      <Line type="secondary">{line}</Line>
    </div>
  </Brand>
)

export default SALogo

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginXS}px;
  color: inherit;
`

const Mark = styled(CheckSquareFilled)`
  color: ${({ theme }) => theme.colorPrimary};
  font-size: 32px;
`

const Name = styled(Typography.Text)`
  display: block;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
`

const Line = styled(Typography.Text)`
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
`
