import { Integrations as ApmIntegrations } from "@sentry/apm";
import * as Sentry from "@sentry/browser";
import { ApolloClient } from "apollo-client";
import * as React from "react";
import { positions, Provider as AlertProvider, useAlert } from "react-alert";
import { ApolloProvider } from "react-apollo";
import { render } from "react-dom";
import TagManager from "react-gtm-module";
import { hot } from "react-hot-loader";
import { Route, Router } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { QueryParamProvider } from "use-query-params";

import { NotificationTemplate } from "@components/atoms";
import {
  ServiceWorkerContext,
  ServiceWorkerProvider,
} from "@components/containers";
import { SaleorProvider, useAuth } from "@saleor/sdk";
import { CustomConfig } from "@saleor/sdk/lib/types";
import { defaultTheme, GlobalStyle } from "@styles";

import { App } from "./app";
import { OverlayProvider } from "./components";
import ShopProvider from "./components/ShopProvider";
import {
  apiUrl,
  sentryDsn,
  sentrySampleRate,
  serviceWorkerTimeout,
} from "./constants";
import { history } from "./history";

const SALEOR_CONFIG: CustomConfig = {
  apiUrl,
};

const Notifications: React.FC = () => {
  const alert = useAlert();

  const { updateAvailable } = React.useContext(ServiceWorkerContext);

  React.useEffect(() => {
    if (updateAvailable) {
      alert.show(
        {
          actionText: "Refresh",
          content:
            "To update the application to the latest version, please refresh the page!",
          title: "New version is available!",
        },
        {
          onClose: () => {
            location.reload();
          },
          timeout: 0,
          type: "success",
        }
      );
    }
  }, [updateAvailable]);

  const { loaded, authenticated } = useAuth();
  const [signedIn, setSignedIn] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    if (loaded && signedIn === undefined) {
      setSignedIn(authenticated);
    } else if (loaded) {
      if (!signedIn && authenticated) {
        alert.show(
          {
            title: "You are now logged in",
          },
          { type: "success" }
        );
      } else if (signedIn && !authenticated) {
        alert.show(
          {
            title: "You are now logged out",
          },
          { type: "success" }
        );
      }
      setSignedIn(authenticated);
    }
  }, [loaded, authenticated]);

  return null;
};

if (process.env.GTM_ID !== undefined) {
  TagManager.initialize({ gtmId: process.env.GTM_ID });
}

const startApp = async () => {
  if (sentryDsn !== undefined) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [new ApmIntegrations.Tracing()],
      tracesSampleRate: sentrySampleRate,
    });
  }

  const notificationOptions = {
    position: positions.BOTTOM_RIGHT,
    timeout: 2500,
  };

  const Root = hot(module)(() => {
    return (
      <Router history={history}>
        <QueryParamProvider ReactRouterRoute={Route}>
          <SaleorProvider config={SALEOR_CONFIG}>
            {(client: ApolloClient<any>) => (
              <ApolloProvider client={client}>
                <ShopProvider>
                  <OverlayProvider>
                    <App />
                    <Notifications />
                  </OverlayProvider>
                </ShopProvider>
              </ApolloProvider>
            )}
          </SaleorProvider>
        </QueryParamProvider>
      </Router>
    );
  });

  render(
    <ThemeProvider theme={defaultTheme}>
      <AlertProvider
        template={NotificationTemplate as any}
        {...notificationOptions}
      >
        <ServiceWorkerProvider timeout={serviceWorkerTimeout}>
          <GlobalStyle />
          <Root />
        </ServiceWorkerProvider>
      </AlertProvider>
    </ThemeProvider>,
    document.getElementById("root")
  );

  // Hot Module Replacement API
  if (module.hot) {
    module.hot.accept();
  }
};

startApp();
