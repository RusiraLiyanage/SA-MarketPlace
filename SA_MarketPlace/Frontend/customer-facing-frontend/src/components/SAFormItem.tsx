import { Form } from 'antd'
import styled from 'styled-components'

// A form field whose hint (`extra`) sits a little below the input and is small, so a long rule such as the password one stays on one line.
const SAFormItem = styled(Form.Item)`
  .ant-form-item-extra {
    margin-top: ${({ theme }) => theme.marginXS}px;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`

export default SAFormItem
