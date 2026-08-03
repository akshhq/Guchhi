import { Router } from 'express';
import * as AddressController from '../controllers/address.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator';

const router = Router();
router.use(authenticate);

router.get('/', AddressController.listAddresses);
router.post('/', validate(createAddressSchema), AddressController.createAddress);
router.patch('/:id', validate(updateAddressSchema), AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);

export default router;
