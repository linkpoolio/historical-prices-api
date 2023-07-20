import { useState } from "react";
import {
  validateContractAddress,
  validateChain,
} from "../lib/inputValidations";

function useFormValidation(initialState) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  const validateInputs = () => {
    let isValid = true;
    let errors = {};

    const contractAddressValidation = validateContractAddress(
      formData.contractAddress
    );
    const chainValidation = validateChain(formData.chain);

    if (contractAddressValidation.error) {
      errors.contractAddress = contractAddressValidation.error.message;
      isValid = false;
    }

    if (chainValidation.error) {
      errors.chain = chainValidation.error.message;
      isValid = false;
    }

    // Other validations...

    setErrors(errors);
    return isValid;
  };

  const handleChange = (name) => (e) => {
    setFormData({ ...formData, [name]: e.target.value });
    // Reset the error when the user changes the value
    setErrors({ ...errors, [name]: "" });
  };

  return { formData, errors, validateInputs, handleChange };
}

export default useFormValidation;
