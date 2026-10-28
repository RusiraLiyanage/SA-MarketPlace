import { CheckSquareFilled } from '@ant-design/icons'
import { Typography } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

// The marketplace mark from the designs: a check square with the app name and its product line.
const SALogo = () => (
  <Brand to={PATHS.shop}>
    <Mark />
    <div>
      <Name>Sample Assist</Name>
      <Line type="secondary">MARKETPLACE</Line>
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
  font-size: 18px;
  font-weight: 600;
  line-height: 1.1;
`

const Line = styled(Typography.Text)`
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
`
