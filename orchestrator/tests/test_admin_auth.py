"""
Tests for admin authorization utility.
"""
import unittest
import os
from app.utils.admin_auth import AdminAuthenticator


class TestAdminAuthenticator(unittest.TestCase):
    """Test cases for AdminAuthenticator class."""

    def setUp(self):
        """Set up test fixtures."""
        # Clear environment variables
        os.environ.pop('ALLOW_SECRET_WRITES', None)
        os.environ.pop('ADMIN_USER_IDS', None)
        os.environ.pop('ADMIN_ROLE_IDS', None)

    def test_default_secret_writes_disabled(self):
        """Test that secret writes are disabled by default."""
        auth = AdminAuthenticator()
        self.assertFalse(auth.can_write_secrets())

    def test_secret_writes_enabled_with_flag(self):
        """Test that secret writes can be enabled with flag."""
        os.environ['ALLOW_SECRET_WRITES'] = 'true'
        auth = AdminAuthenticator()
        self.assertTrue(auth.can_write_secrets())

    def test_is_admin_with_user_id(self):
        """Test admin check with user ID."""
        os.environ['ADMIN_USER_IDS'] = 'user1,user2,user3'
        auth = AdminAuthenticator()
        
        self.assertTrue(auth.is_admin('user1'))
        self.assertTrue(auth.is_admin('user2'))
        self.assertFalse(auth.is_admin('user4'))

    def test_is_admin_with_role_id(self):
        """Test admin check with role ID."""
        os.environ['ADMIN_ROLE_IDS'] = 'role1,role2'
        auth = AdminAuthenticator()
        
        self.assertTrue(auth.is_admin('anyuser', ['role1']))
        self.assertTrue(auth.is_admin('anyuser', ['role2', 'other']))
        self.assertFalse(auth.is_admin('anyuser', ['role3']))

    def test_authorize_admin_action_not_admin(self):
        """Test authorization fails for non-admin."""
        auth = AdminAuthenticator()
        result = auth.authorize_admin_action('user1')
        
        self.assertFalse(result['authorized'])
        self.assertIn('admin only', result['message'])

    def test_authorize_admin_action_admin_no_secret_write(self):
        """Test authorization succeeds for admin without secret write."""
        os.environ['ADMIN_USER_IDS'] = 'user1'
        auth = AdminAuthenticator()
        result = auth.authorize_admin_action('user1', requires_secret_write=False)
        
        self.assertTrue(result['authorized'])

    def test_authorize_admin_action_admin_secret_write_disabled(self):
        """Test authorization fails when secret write required but disabled."""
        os.environ['ADMIN_USER_IDS'] = 'user1'
        auth = AdminAuthenticator()
        result = auth.authorize_admin_action('user1', requires_secret_write=True)
        
        self.assertFalse(result['authorized'])
        self.assertIn('ALLOW_SECRET_WRITES', result['message'])

    def test_authorize_admin_action_full_authorization(self):
        """Test full authorization with all requirements met."""
        os.environ['ADMIN_USER_IDS'] = 'user1'
        os.environ['ALLOW_SECRET_WRITES'] = 'true'
        auth = AdminAuthenticator()
        result = auth.authorize_admin_action('user1', requires_secret_write=True)
        
        self.assertTrue(result['authorized'])

    def test_get_value_fingerprint(self):
        """Test value fingerprint generation."""
        fingerprint = AdminAuthenticator.get_value_fingerprint('test-value')
        
        self.assertTrue(fingerprint.startswith('…'))
        self.assertEqual(len(fingerprint), 5)  # … + 4 chars

    def test_get_value_fingerprint_empty(self):
        """Test fingerprint for empty value."""
        fingerprint = AdminAuthenticator.get_value_fingerprint('')
        
        self.assertEqual(fingerprint, '…(empty)')

    def test_get_value_fingerprint_consistent(self):
        """Test fingerprint is consistent for same value."""
        fp1 = AdminAuthenticator.get_value_fingerprint('test')
        fp2 = AdminAuthenticator.get_value_fingerprint('test')
        
        self.assertEqual(fp1, fp2)

    def test_get_value_fingerprint_different_values(self):
        """Test fingerprint differs for different values."""
        fp1 = AdminAuthenticator.get_value_fingerprint('test1')
        fp2 = AdminAuthenticator.get_value_fingerprint('test2')
        
        self.assertNotEqual(fp1, fp2)


if __name__ == '__main__':
    unittest.main()
