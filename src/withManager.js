import React, { Component } from "react";
import PropTypes from "prop-types";
import deepEqual from "deep-equal";
import { ignoreUpdateStrategy } from "./UpdateStrategy";

class DefaultLoadingScreen extends Component {
  render() {
    return (
      <div className="container">
        <h1>Loading</h1>
      </div>
    );
  }
}

class DefaultErrorScreen extends Component {
  render() {
    return (
      <div className="container">
        <h4>Error</h4>
        <h2>
          {this.props.error.message}
        </h2>
      </div>
    );
  }
}

let propTypes = {
  manager: PropTypes.shape({
    onChange: PropTypes.func.isRequired,
    submit: PropTypes.func.isRequired,
    updateIfChanged: PropTypes.func.isRequired,
  }).isRequired,
  updateStrategy: PropTypes.shape({
    onChange: PropTypes.func.isRequired,
    stop: PropTypes.func.isRequired,
  }).isRequired,
};

export default function withManager(
  ConfigManagementComponent,
  manager,
  updateStrategy = ignoreUpdateStrategy
) {
  updateStrategy = updateStrategy(manager);

  PropTypes.checkPropTypes(
    propTypes,
    { manager, updateStrategy },
    "props",
    "react-jsonschema-form-manager"
  );

  const origUpdate = manager.updateIfChanged;
  manager.updateIfChanged = (force = false) => {
    let upd = origUpdate(force);
    if (upd) {
      upd.then(formData => manager.onUpdate(formData));
    }
    return upd;
  };

  return (
    FormComponent,
    LoadingScreen = DefaultLoadingScreen,
    ErrorScreen = DefaultErrorScreen
  ) => {
    class FormWithManager extends Component {
      constructor(props) {
        super(props);

        this.state = { isLoading: true, isError: false };
        manager.onUpdate = this.handleUpdate;

        this.handleConfigChange = this.handleConfigChange.bind(this);
      }

      componentWillUnmount() {
        manager.stop();
      }

      updateExternal = (state, callback) => {
        this.formData = state.formData;
        this.setState({ formData: state.formData });
        if (callback) {
          callback(state);
        }
      };

      handleChange = state => {
        manager.onChange(state);
        updateStrategy.onChange(state);
        this.updateExternal(state, this.props.onChange);
      };

      handleSubmit = state => {
        manager.submit(state.formData).then(() => {
          this.updateExternal(state, this.props.onSubmit);
        });
      };

      handleUpdate = formData => {
        this.setState({ formData });
        if (this.props.onUpdate) {
          this.props.onUpdate(formData);
        }
      };

      handleConfigChange = configResolver => {
        configResolver
          .resolve()
          .then(config => {
            this.setState({
              isLoading: false,
              isEqual: false,
              config,
              formData: config.formData,
            });
          })
          .catch(error => {
            this.setState({ isLoading: false, isError: true, error });
          });
      };

      shouldComponentUpdate(nextProps, nextState) {
        let sameData = deepEqual(nextState.formData, this.formData);
        let sameState =
          nextState.isLoading === this.state.isLoading &&
          nextState.isError === this.state.isError;
        let sameProps = deepEqual(this.props, nextProps);
        return !sameProps || !sameData || !sameState;
      }

      render() {
        let { isLoading, isError, error, config, formData } = this.state;

        if (isLoading) {
          return <LoadingScreen />;
        } else if (isError) {
          return <ErrorScreen error={error} />;
        } else {
          let configs = Object.assign({}, this.props, config, { formData });
          return (
            <div>
              <ConfigManagementComponent
                onConfigChange={this.handleConfigChange}
              />
              <FormComponent
                {...configs}
                onSubmit={this.handleSubmit}
                onChange={this.handleChange}
              />
            </div>
          );
        }
      }
    }

    return FormWithManager;
  };
}
