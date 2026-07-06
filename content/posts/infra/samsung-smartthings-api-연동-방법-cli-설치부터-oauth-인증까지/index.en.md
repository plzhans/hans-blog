---
id: "110"
translationKey: "110"
slug: "110-samsung-smartthings-api-integration-cli-oauth"
title: "How to Integrate Samsung SmartThings API - From CLI Installation to OAuth Authentication"
description: "A step-by-step guide covering CLI installation, OAuth app creation, Redirect URI configuration, token issuance, and device listing for Samsung SmartThings API integration."
categories:
  - "infra"
tags:
  - "iot"
  - "OpenClaw"
  - "smartthing"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-07-06T02:42:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8044-b526-d76309a8b4d4.png"
---


![](./assets/1_39522a0f-7e83-8044-b526-d76309a8b4d4.png)


## Overview


SmartThings is an IoT platform provided by Samsung Electronics.


It allows you to connect and control smart home devices such as lights, air conditioners, TVs, sensors, plugs, and door locks under a single account and Location.


With the SmartThings API, you can automate tasks that were previously only possible through the SmartThings app from external services or personal servers.


For example, you can use the REST API or SmartThings CLI to retrieve registered device lists, check device status, control power, set temperatures, and configure automation conditions.


This article covers the basic preparation steps for SmartThings API integration. The overall flow is as follows:

1. Prepare a SmartThings account and devices.
2. Install the SmartThings CLI.
3. Complete account authentication by logging in through the CLI.
4. Create an app or token required for API calls.
5. Verify the device list and permission scopes.
6. Call the SmartThings API from an external application.

For personal testing or simple automation, you can get started quickly with a Personal Access Token (PAT).


However, for long-running services or apps that require user authentication, OAuth-based integration is more appropriate.


## Installation


To begin SmartThings API integration, first install the SmartThings CLI.


The CLI is an official tool that allows you to use the SmartThings API from the terminal.


You can use the CLI to handle tasks such as app creation, authentication, device listing, and command execution.


### Installing on macOS with Homebrew


On macOS, using Homebrew is the simplest method.


```bash
# Trust the SmartThings Community formula
brew trust --formula smartthingscommunity/smartthings/smartthings-prerelease

# Install SmartThings CLI
brew install smartthingscommunity/smartthings/smartthings

# Verify installation
smartthings --version
```


`brew trust` registers the formula provided by the SmartThings Community tap as trusted. After that, `brew install` installs the SmartThings CLI.


Once the installation is complete, verify it with the `smartthings --version` command. If version information is displayed, the CLI is ready to use.


### Installing on Windows


On Windows, downloading and using the SmartThings CLI executable is the recommended approach.


Download the Windows archive from the [GitHub Releases page](https://github.com/SmartThingsCommunity/smartthings-cli/releases), then place the executable in a directory included in `PATH`.

1. Go to the SmartThings CLI [GitHub Releases page](https://github.com/SmartThingsCommunity/smartthings-cli/releases).
2. Download the Windows archive.
3. Extract the archive.
4. Copy the `smartthings.exe` file to your preferred directory.
5. Add that directory to the Windows `PATH` environment variable.
6. Open a new PowerShell or Command Prompt window and verify the installation.

```powershell
smartthings --version
```


If the `smartthings --version` command displays version information, the installation is complete. If you get a "command not found" error, check that the directory containing `smartthings.exe` is properly registered in `PATH`.


### Installing with npm in a Node.js Environment


If Node.js is already installed in your development environment, you can install the SmartThings CLI via npm. This method works across Windows, macOS, and Linux.


```bash
npm install -g @smartthings/cli

smartthings --version
```


The npm method is convenient in Node.js-based development environments. If you prefer not to add a Node.js dependency, using the OS-specific executable or Homebrew installation is simpler.


### Installing on Linux


On Linux, download the SmartThings CLI release file, grant execution permissions, and place it in the system path. This is a general installation flow that works regardless of the distribution.


```bash
# Create installation directory
mkdir -p ~/bin

# Download and extract the SmartThings CLI Linux file
# Adjust the actual filename and URL to match the latest version on the [GitHub Releases page](https://github.com/SmartThingsCommunity/smartthings-cli/releases).
tar -xzf smartthings-linux-x64.tar.gz

# Move the executable
mv smartthings ~/bin/

# Grant execution permission
chmod +x ~/bin/smartthings

# Register PATH
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
smartthings --version
```


If you use zsh as your shell, register the PATH in `~/.zshrc` instead of `~/.bashrc`.


```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```


In server environments, you can place it in `/usr/local/bin` to make it available to all user accounts.


```bash
sudo mv smartthings /usr/local/bin/
sudo chmod +x /usr/local/bin/smartthings

smartthings --version
```


## App Creation and Authentication


To prepare for OAuth-based integration, create an app using the SmartThings CLI.


```bash
smartthings apps:create
```


Running this command initiates a procedure to enter information such as the app name, description, permission scopes, and redirect URL.


During this process, you register the app information that will be used for API calls.


```bash
smartthings apps:create
✔ What kind of app do you want to create? (Currently, only OAuth-In apps are
supported.) OAuth-In App

More information on writing SmartApps can be found at
  https://developer.smartthings.com/docs/connected-services/smartapp-basics

✔ Display Name test-app
✔ Description test
✔ Icon Image URL (optional)
✔ Target URL (optional)

More information on OAuth 2 Scopes can be found at:
  https://www.oauth.com/oauth2-servers/scope/

To determine which scopes you need for the application, see documentation for the individual endpoints you will use in your app:
  https://developer.smartthings.com/docs/api/public/

✔ Select Scopes. r:devices:*, w:devices:*, x:devices:*, r:hubs:*, r:locations:*,
w:locations:*, x:locations:*, r:scenes:*, x:scenes:*, r:rules:*, w:rules:*, r:installedapps,
w:installedapps
✔ Add or edit Redirect URIs. Add Redirect URI.
✔ Redirect URI (? for help) https://httpbin.org/get
✔ Add or edit Redirect URIs. Finish editing Redirect URIs.
✔ Choose an action. Finish and create OAuth-In SmartApp.
Basic App Data:
───────────────────────────────────────────────────────────────
 Display Name     test-app
 App Id           72b65205-14ef-48cb-94eb-xxxxxxxxxxxx
 App Name         testapp-91735007-4498-4b3a-96f0-xxxxxxxxxxxx
 Description      test
 Single Instance  true
 Classifications  CONNECTED_SERVICE
 App Type         API_ONLY
───────────────────────────────────────────────────────────────


OAuth Info (you will not be able to see the OAuth info again so please save it now!):
───────────────────────────────────────────────────────────────
 OAuth Client Id      19c1fcbf-988c-4bc0-bccf-xxxxxxxxxxxx
 OAuth Client Secret  1b95dfcf-2227-4b98-9547-xxxxxxxxxxxx
───────────────────────────────────────────────────────────────
```


## API Usage


### Choosing an API Integration Method


There are two main ways to call the SmartThings API:

- Personal Access Token (PAT)
    - Suitable for personal testing and simple automation.
    - Token generation is straightforward.
    - You select and issue the required permission scopes directly.
    - May not be suitable for long-running production services.
- OAuth App
    - Suitable for external applications or services that require user authentication.
    - Operates on a model where users approve permissions.
    - Can be managed with access tokens and refresh tokens.
    - If building a service for distribution, consider this method first.

### OAuth Authentication and Token Issuance


This method is for development purposes. In production environments, it is safer to use an HTTPS callback URL that you control directly.


This step is performed after obtaining the OAuth Client ID and OAuth Client Secret via `smartthings apps:create`.


If you are not setting up a separate web server, register a temporary callback URL as the Redirect URI.


```plain text
https://httpbin.org/get
```


The `redirect_uri` in the authorization URL and the `redirect_uri` in the token request must exactly match the value registered during app creation.


```plain text
https://api.smartthings.com/oauth/authorize?response_type=code&client_id=<client-id>&redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&scope=<scope>
```


After approval, copy the `code` value from the redirected URL and use it in the token issuance request.


```bash
curl -X POST "https://api.smartthings.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "<client-id>:<client-secret>" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization-code>" \
  -d "redirect_uri=https://httpbin.org/get"
```


When actually using the SmartThings API, you should refer to the official Samsung SmartThings API documentation to verify endpoints, permission scopes, and request/response formats.


The official documentation provides APIs for major resources such as Devices, Locations, Scenes, Rules, and Installed Apps. When implementing device control, the typical flow is to first retrieve the device list, check the capability and command structure of each device, and then call the command API.


Use the following links for reference documentation:

- [SmartThings Public API Documentation](https://developer.smartthings.com/docs/api/public/)
- [SmartThings Developer Documentation](https://developer.smartthings.com/docs/)
- [SmartThings CLI Documentation](https://developer.smartthings.com/docs/sdks/cli/)

For simple tests, it is recommended to start with `curl` or Postman. When applying to actual services or automation scripts, select only the necessary permissions as scopes and store tokens securely.


```bash
curl -X GET "https://api.smartthings.com/v1/devices" \
  -H "Authorization: Bearer <access-token>"
```


The above request retrieves the list of devices connected to the account. After checking the device ID and capability information in the response, you can extend to status queries or command execution APIs.


## CLI Usage


Use this when directly controlling devices with the previously installed CLI.


Login


```bash
smartthings login
```


Running this command initiates a browser-based authentication process.


After logging in with your Samsung account and approving the permission request, the CLI can access the resources of your SmartThings account.


Once login is complete, verify the registered locations with the following command:


```bash
smartthings locations
```


Check the list of connected devices with the following command:


```bash
smartthings devices
```


If you need detailed information about a specific device, specify the device ID.


```bash
smartthings devices <device-id>
```


## Conclusion


The OAuth Client ID and Client Secret issued at this point cannot be retrieved again, so you must save them separately.


In test environments where you are not running a web server, you can use a temporary Redirect URI such as `https://httpbin.org/get`.


However, the Redirect URI registered during app creation, the authorization URL, and the `redirect_uri` value used in the token issuance request must all be identical.


After token issuance is complete, refer to the SmartThings Public API documentation to identify the required endpoints and scopes.


The typical flow is: device list retrieval, capability verification, status query, and command execution, in that order.


The CLI is useful for verifying installation and performing simple device queries.


For actual services or automation scripts, it is important to select only the necessary permissions based on the API documentation and to securely manage tokens and Client Secrets.
