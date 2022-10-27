import { gql, request } from 'graphql-request'
import { selectorFamily, atomFamily } from 'recoil'

export const entitySchemasQuery = selectorFamily({
    key: '@entityQuery',
    get:
      (deploymentUrl) =>
      async ({ get }) => {
        if(!deploymentUrl) return []
        const { __schema } = await executeQuery(deploymentUrl, queryEntityList)
        const { types } = __schema
        const entityList = types
          .filter(
            (type) =>
              type.kind === 'OBJECT' &&
              !type.name.startsWith('_') &&
              type.name !== 'Query' &&
              type.name !== 'Mutation' &&
              type.name !== 'Subscription'
          )
          .map((entity) => ({
            name: entity.name,
            fields: entity.fields
              ?.map((field) => ({
                name: field.name,
                type: field.type.name || field.type.ofType?.name || field.type.ofType?.kind
              }))
              .sort((a, b) => {
                if (a.name.startsWith('tx') && !b.name.startsWith('tx')) {
                  return 1
                }
                if (a.name < b.name) {
                  return -1
                }
                if (a.name > b.name) {
                  return 1
                }
                return 0
              })
          }))
  
        return entityList
      }
  })
  
export const entitySchema = selectorFamily({
key: '@entitySchema',
get:
    ({ subgraphId, entityName }) =>
    async ({ get }) => {
    const entitySchemas = get(entitySchemasQuery(subgraphId))
    // const entitySchema = entitySchemas.find((schema) => schema.name === entityName)
    const entitySchema = entitySchemas[0]
    return entitySchema
    }
})
export const executeQuery = async (
  httpAPI,
  query,
  variables,
  minTime = 0
) => {
  const res = await request(httpAPI, query, variables)
  return res
}
export const queryEntityList = gql`
  query {
    __schema {
      types {
        name
        kind
        fields {
          name
          description
          type {
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  }`
  export const entityFilterFamily = atomFamily({
  key: '@entityFilterFamily',
  default: ({ subgraphId, entityName }) => {
    return {
      subgraphId,
      entityName,
      form: {
        count: 10,
        where: []
      }
    }
  }
})