/** Runs antd form validation; resolves to the values, or null when a field is invalid (the form shows why). */
export async function validated(form) {
  try {
    return await form.validateFields()
  } catch (e) {
    if (e && e.errorFields) return null
    throw e
  }
}
