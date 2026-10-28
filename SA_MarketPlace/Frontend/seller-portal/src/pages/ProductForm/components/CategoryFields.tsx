import { Col, Form, Row, Select, type FormInstance } from 'antd'
import { subCategoriesOf, type ProductFormValues } from 'src/pages/ProductForm/productForm'
import type { CategoryTreeItem } from 'src/store/catalogue/types'

interface Props {
  form: FormInstance<ProductFormValues>
  categories: CategoryTreeItem[]
}

// Category, then the sub-categories of that category. The backend takes the sub-category if one is chosen, else the category.
const CategoryFields = ({ form, categories }: Props) => {
  const categoryId = Form.useWatch('categoryId', form)
  const subCategories = subCategoriesOf(categories, categoryId)

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true, message: 'Choose a category' }]}>
          <Select
            placeholder="Select category"
            options={categories.map(({ id, name }) => ({ value: id, label: name }))}
            // A sub-category belongs to one category, so changing the category clears it.
            onChange={() => form.setFieldValue('subCategoryId', undefined)}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Sub-category" name="subCategoryId">
          <Select
            allowClear
            disabled={subCategories.length === 0}
            placeholder={!categoryId ? 'Select a category first' : subCategories.length > 0 ? 'Select sub-category' : 'No sub-categories'}
            options={subCategories.map(({ id, name }) => ({ value: id, label: name }))}
          />
        </Form.Item>
      </Col>
    </Row>
  )
}

export default CategoryFields
