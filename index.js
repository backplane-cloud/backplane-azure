import asyncHandler from "express-async-handler";
import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { ClientSecretCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";

import { PolicyClient } from "@azure/arm-policy";

// Azure SDK API

// import { SubscriptionClient } from "@azure/arm-subscriptions";
// import { BillingManagementClient } from "@azure/arm-billing";

async function roleAssignments_listForScope(subscriptionId) {
  let result = [];
  for await (const item of client.roleAssignments.listForScope(
    `/subscriptions/${subscriptionId}`
  )) {
    result.push(item);
  }
  return result;
}

async function roleAssignments_listForResourceGroup(
  environments,
  credentials,
  subscriptionId
) {
  let masterResult = [];
  let client = {};
  client = new AuthorizationManagementClient(credentials, subscriptionId);

  const resultArr = await Promise.all(
    environments.map(async (env) => {
      let result = [];
      let rg = env.accountId.split("/")[4];
      // console.log(rg);
      for await (const item of client.roleAssignments.listForResourceGroup(
        rg
      )) {
        result.push(item);
      }
      masterResult.push({ environment: env, assignments: result });
    })
  );

  return masterResult;
}

async function getAzureAccess({ cloudCredentials, environments }) {
  const { tenantId, clientId, clientSecret, subscriptionId } = cloudCredentials;

  // Authenticate to Cloud Platform
  const credentials = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );
  // return environments;

  //let assignments = await roleAssignments_listForScope();
  let assignments = await roleAssignments_listForResourceGroup(
    environments,
    credentials,
    subscriptionId
  );
  return assignments;
}

async function getAzureCost({ cloudCredentials, environments }) {
  const { tenantId, clientId, clientSecret, subscriptionId } = cloudCredentials;

  // Authenticate to Cloud Platform
  const credentials = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  const resourceClient = new ResourceManagementClient(
    credentials,
    subscriptionId
  );

  try {
    let costArr = [];
    environments.map(async (env) => {
      const resourceGroupName = env.accountId.split("/")[4];
      // Get the resource group
      const resourceGroup = await resourceClient.resourceGroups.get(
        resourceGroupName
      );
      // Retrieve the cost for the resource group

      const cost = resourceGroup.tags
        ? resourceGroup.tags.cost
        : "Cost information not available";
      costArr.push(cost);
    });

    // console.log(`Cost for resource group ${resourceGroupName}: ${cost}`);
    return costArr.length !== 0
      ? costArr
      : "There is no Cost information available for this App";
  } catch (error) {
    console.error("Error retrieving resource group cost:", error);
    throw error;
  }
}

async function policyAssignments_listForResourceGroup(
  environments,
  credentials,
  subscriptionId
) {
  let masterResult = [];
  const client = new PolicyClient(credentials, subscriptionId);

  await Promise.all(
    environments.map(async (env) => {
      let result = [];
      let rg = env.accountId.split("/")[4];
      for await (const item of client.policyAssignments.listForResourceGroup(
        rg
      )) {
        result.push(item);
      }
      masterResult.push({ environment: env, assignments: result });
    })
  );

  return masterResult;
}

async function getAzurePolicies({ cloudCredentials, environments }) {
  const { tenantId, clientId, clientSecret, subscriptionId } = cloudCredentials;

  // Authenticate to Cloud Platform
  const credentials = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  const policies = await policyAssignments_listForResourceGroup(
    environments,
    credentials,
    subscriptionId
  );

  return policies;
}

const createAzureEnv = asyncHandler(async (req, res) => {
  // AZURE API CODE

  console.log(`Cloud Credentials: ${req.cloudCredentials}`);

  const { tenantId, clientId, clientSecret } = req.cloudCredentials;
  const { environs, subscriptionId, appCode, orgCode } = req;

  // Authenticate to Cloud Platform
  const credentials = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  // Do something in the Cloud platform.

  // Azure services
  const resourceClient = new ResourceManagementClient(
    credentials,
    subscriptionId
  );

  // Create Resource Groups
  const location = "ukwest";

  async function createResourceGroups() {
    let collectResults = [];
    const groupParameters = {
      location: location,
    };

    for (let env of environs) {
      let resourceGroupName = `_bp-${orgCode}-${appCode}-${env}`;
      console.log("\n Creating resource group: " + resourceGroupName);
      const resCreate = await resourceClient.resourceGroups.createOrUpdate(
        resourceGroupName,
        groupParameters
      );

      collectResults.push(resCreate);
    }

    return collectResults;
  }

  const rgResult = await createResourceGroups();
  console.log("Environments:", rgResult);

  // Build Environment Array of Object for App document
  //const environments = [];
  const getenvirons = () => {
    let collectEnv = [];
    for (let environ of environs) {
      collectEnv.push({
        name: environ,
        accountId: rgResult[environs.indexOf(environ)].id,
        spn: {},
      });
    }
    return collectEnv;
  };

  const environments = getenvirons();

  console.log("Environments:", environments);

  return environments;
});

export { getAzureCost, getAzurePolicies, getAzureAccess, createAzureEnv };
