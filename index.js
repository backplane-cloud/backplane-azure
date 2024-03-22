import asyncHandler from "express-async-handler";

// Azure SDK API

// import { SubscriptionClient } from "@azure/arm-subscriptions";
// import { BillingManagementClient } from "@azure/arm-billing";
import { ResourceManagementClient } from "@azure/arm-resources";

// ACTIVE
import { ClientSecretCredential } from "@azure/identity";
// import { AuthorizationManagementClient } from "@azure/arm-authorization";
// import { PolicyClient } from "@azure/arm-policy";

// Internal Function to Create Azure Environments

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

export { createAzureEnv };
