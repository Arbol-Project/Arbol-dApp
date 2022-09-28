import os
import json
import base64
import hashlib
import hmac

from coincurve import PrivateKey, PublicKey
from coincurve.utils import get_valid_secret

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# this is a dict for some reason when loading from SecretsManager
PRIVATE_KEY = bytes.fromhex(json.loads(os.environ.get("NODE_PRIVATE_KEY"))["NODE_PRIVATE_KEY"])


def get_shared_key(public_key, private_key):
    ''' Takes a public key and a private key, presumably from 2 peers 
        (i.e. not of the same keypair), and calculates their shared key and MAC key

        To be compatible with EthCrypto.encryptWithPublicKey and EthCrypto.decryptWithPrivateKey,
        the MAC key and shared key are derived from the hash of the X coordinate of the shared point

        Parameters: public_key (PublicKey), public key to use in the secret key derivation
        Parameters: private_key (PrivateKey), private key to use in the secret key derivation
        Returns: bytes, the derived shared key
                 bytes, the derived MAC key
    '''
    print('get_shared_key', flush=True)
    shared_point = public_key.multiply(private_key.secret)
    x = shared_point.format(compressed=True)[1:]
    m = hashlib.sha512()
    m.update(x)
    hash_result = m.digest()
    return hash_result[:32], hash_result[32:]


def verify_mac(tag, key, mac_data):
    ''' Calculates a MAC tag from the given MAC key and data
        and compares with the given tag

        Parameters: tag (bytes), MAC tag to match
        Parameters: key (bytes), MAC key to use for derivation
        Parameters: mac_data (bytes), data to use for derivation
                    mac_data contains the following ordered data
                    iv: first 16 bytes
                    ephemPublicKey: next 65 bytes (decompressed)
                    ciphertext: remaining bytes
        Returns: bool, the result of the comparison
    '''
    print('verify_mac', flush=True)
    mac = hmac.new(key, msg=mac_data, digestmod=hashlib.sha256).hexdigest()
    return mac == tag.hex()


def compress_public_key(public_key: bytes):
    ''' Compresses public key if it is uncompressed

        Compressed public keys start with the byte 02 or 03 (sign of y coordinate) and are 
        33 bytes, uncompressed public keys start with the byte 04 and are 65 bytes

        If the given public key does not start with the tag 04 but is 64 
        bytes long then it is assumed that it represents an uncompressed public key and 
        the uncompressed tag is prepended before compressing

        If the given public key has a compressed tag but is longer than 33 bytes, it is
        truncated to byte length of 33

        Parameters: public_key (bytes), bytestring of public key
        Returns: bytes, the compressed public key
    '''
    print('compress_public_key', flush=True)
    if (public_key[0] == 2 or public_key[0] == 3) and len(public_key) >= 33:
        return public_key[:33]
    elif public_key[0] == 4 and len(public_key) == 65:
        return PublicKey(public_key).format(compressed=True)
    elif len(public_key) == 64:
        return PublicKey(bytes.fromhex('04') + public_key).format(compressed=True)
    else:
        return 'cannot compress invalid public key', 0


def decompress_public_key(public_key: bytes):
    ''' Decompresses public key if it is compressed

        Compressed public keys start with the byte 02 or 03 (sign of y coordinate) and are 
        33 bytes, decompressed public keys start with the byte 04 and are 65 bytes

        If the given public key does not start with any of the compression tags but is 64 
        bytes long then it is assumed that it represents an uncompressed public key and 
        the uncompressed tag is prepended

        If the given public key has a compressed tag but is longer than 33 bytes, it is
        truncated to byte length of 33

        Parameters: public_key (bytes), bytestring of public key
        Returns: bytes, the decompressed public key
        Returns: int, the length of the initially supplied public key after its compression
        state has been determined
    '''
    print('decompress_public_key', flush=True)
    if (public_key[0] == 2 or public_key[0] == 3) and len(public_key) >= 33:
        print(f'public_key {public_key[:33]}', flush=True)
        return PublicKey(public_key[:33]).format(compressed=False), 33
    elif public_key[0] == 4 and len(public_key) == 65:
        print(f'public_key {public_key}', flush=True)
        return public_key, 65
    elif len(public_key) == 64:
        print(f'public_key {bytes.fromhex("04") + public_key}', flush=True)
        return bytes.fromhex('04') + public_key, 64
    else:
        return f'cannot decompress invalid public key', 0


# def bytestringify_key_cipher(cipher: dict):
#     ''' Takes a mapping of encryption arguments to bytestrings
#         and returns a single combined bytestring

#         Compresses the ephemeral public key in the process

#         Parameters: cipher (dict), encryption object to bytestringify
#                         cipher contains the following key/value pairs
#                         iv: 16 bytes
#                         ephemPublicKey: 33 bytes if compressed, 65 if decompressed
#                         mac: 32 bytes
#                         ciphertext: remaining bytes
#         Returns: bytes, combined bytestring of 
#         iv + ephemeral public key (compressed) + mac + ciphertext
#     '''
#     public_key = compress_public_key(cipher['ephemPublicKey'])
#     return cipher['iv'] + public_key + cipher['mac'] + cipher['ciphertext']


def parse_key_cipher(cipher_bytes: bytes):
    ''' Parses iv, mac, ephemeral public key, and ciphertext from cipher bytestring 
        and returns mapping of their values

        Decompresses the ephemeral public key in the process

        Parameters: cipher_bytes (bytes), bytestring of (AES CBC) cipher
                        cipher_bytes contains the following ordered data
                        iv: first 16 bytes
                        ephemPublicKey: next 33 bytes if compressed, 65 if decompressed
                        mac: next 32 bytes
                        ciphertext: remaining bytes
        Returns: dict, mapping of encryption components to their bytes representations
    '''
    print('parse_key_cipher', flush=True)
    public_key, initial_length = decompress_public_key(cipher_bytes[16:81])
    if type(public_key) is not bytes:
        return {'error': public_key}
    else:
         return {
            'iv': cipher_bytes[:16],
            'ephemPublicKey': public_key,
            'mac': cipher_bytes[16+initial_length:16+initial_length+32],
            'ciphertext': cipher_bytes[16+initial_length+32:]
        }


def encrypt_access_key(access_key: bytes, public_key: bytes):
    ''' Encrypts the contract access key for the supplied public key

        A random 16 byte iv is generated alonside an ephemeral keypair whose private
        key is combined with the given public key to derive the shared secrets 
        (MAC key and shared key); shared key is used to encrypt and decrypt the access key;
        MAC key is used to derive the MAC tag for verification of data integrity later

        A 16 byte block size is used with AES-CBC so 32 byte keys are padded with a dummy 
        block of 16 bytes

        The MAC tag is computed based on the combined bytestring of 
        iv + ephemeral public key (decompressed) + ciphertext using HMAC SHA256
        
        To be compatible with EthCrypto.encryptWithPublicKey and EthCrypto.decryptWithPrivateKey, 
        access_keys encoding should be converted from hex to utf-8 before padding

        Parameters: access_key (bytes), bytestring of contract access key to be encrypted
        Parameters: public_key (bytes), bytestring of public key to use in encryption
        Returns: bytes, combined bytestring of iv + ephemeral_public_key (compressed) + mac + ciphertext
    '''
    print('encrypt_access_key', flush=True)
    iv = os.urandom(16)

    ephemeral_private_key = PrivateKey(get_valid_secret())
    ephemeral_public_key = ephemeral_private_key.public_key.format(compressed=False)

    decompressed, _ = decompress_public_key(public_key)
    print(f'decompressed {decompressed}', flush=True)
    if type(decompressed) is not bytes:
        return {'error': decompressed}
    public_key = PublicKey(decompressed)
    shared_key, mac_key = get_shared_key(public_key, ephemeral_private_key)
    
    aes_cipher = AES.new(shared_key, AES.MODE_CBC, iv=iv)
    access_bytes = pad(bytes(access_key.hex(), 'utf-8'), 16) # block size is 16
    ciphertext = aes_cipher.encrypt(access_bytes)

    data_to_mac = iv + ephemeral_public_key + ciphertext
    mac = hmac.new(mac_key, msg=data_to_mac, digestmod=hashlib.sha256)
    # encryption = {
    #     'iv': iv,
    #     'ephemPublicKey': compress_public_key(ephemeral_public_key),
    #     'ciphertext': ciphertext,
    #     'mac': bytes.fromhex(mac.hexdigest()),
    # }
    # return bytestringify_key_cipher(encryption)
    return iv + compress_public_key(ephemeral_public_key) + ciphertext + bytes.fromhex(mac.hexdigest())


def decrypt_access_key(node_key: bytes, private_key=PRIVATE_KEY):
    ''' Retrieves the contract access key from the node key cipher

        The node key is an encrypted payload containing the contract
        access key, and is decrypted with the node's private key
        (specifically, the node's keypair used for encryption is a new keypair
        that has never signed a transaction)

        Parses AES-CBC encryption iv, ephemeral public key (decompressed), mac, and 
        ciphertext; derives shared secrets (shared key and MAC key) from node's private
        key and parsed ephemeral public key; computes MAC tag for bytestring from derived 
        MAC key and combined bytestring of iv + ephemeral public key (decompressed) + ciphertext;
        if MAC tags match decrypts the ciphertext with the derived shared key

        A 16 byte block size is used with AES-CBC so plaintexts whose byte length is exactly 
        a multiple of 16 are appended a dummy block of 16 bytes which is stripped following 
        decryption

        To be compatible with EthCrypto.encryptWithPublicKey and EthCrypto.decryptWithPrivateKey, 
        decrypted AES key bytes should be converted from utf-8 to hex aftering unpadding

        Parameters: node_key (bytes), bytestring of contract access key encrypted
        for the Chainlink node
        Parameters: private_key (bytes), bytestring of private key for decryption of node_key
        Returns: bytes, bytestring of access key for decrypting contract URI
    '''
    print('decrypt_access_key', flush=True)
    cipher_args = parse_key_cipher(node_key)
    if 'error' in cipher_args:
        return cipher_args['error']

    print(f'cipher_args {cipher_args}', flush=True)
    print(f'ephemPublicKey type {type(cipher_args["ephemPublicKey"])}', flush=True)
    print(f'private_key type {type(private_key)}', flush=True)

    ephemeral_public_key = PublicKey(cipher_args['ephemPublicKey'])
    private_key = PrivateKey(private_key)

    shared_key, mac_key = get_shared_key(ephemeral_public_key, private_key)

    data_to_mac = cipher_args['iv'] + cipher_args['ephemPublicKey'] + cipher_args['ciphertext']
    if not verify_mac(cipher_args['mac'], mac_key, data_to_mac):
        return 'MACs do not match'

    aes_cipher = AES.new(shared_key, AES.MODE_CBC, iv=cipher_args['iv'])
    access_key = unpad(aes_cipher.decrypt(cipher_args['ciphertext']), 16) # block size is 16
    return bytes.fromhex(access_key.decode('utf-8'))


def reencrypt(node_key: bytes, public_key: bytes):
    ''' Decrypts the encrypted node key and re-encrypts it 
        with the given public key and returns the encrypted string. 

        Parameters: node_key (str), base 64 encoded string of access key encrypted for the Chainlink node
        Parameters: public_key (str), base 64 encoded string of public key to be used for encryption
        Returns: bytes, bytestring of re-encrypted contract access key
    '''
    print('reencrypt', flush=True)
    node_key_bytes = base64.b64decode(node_key)
    access_key = decrypt_access_key(node_key_bytes)
    if type(access_key) is not bytes:
        return {'error': access_key}
    public_key_bytes = base64.b64decode(public_key)
    encryption = encrypt_access_key(access_key, public_key_bytes)
    return encryption


def decrypt(node_key: str, uri: str):
    ''' Accepts 2 encrypted objects, the first of which should be an AES-GCM 
        encryption key encrypted with ECIES (using AES-CBC) with the public key of the 
        Chainlink node (so that it can be decrypted with the node's private key) and 
        the other should be contract evaluation terms encrypted with AES-GCM (using the
        first encrypted argument)

        Parameters: node_key (str), base 64 encoded string of access key encrypted for the Chainlink node
        Parameters: uri (string), base 64 encoded NFT URI with serialized encryption 
                    uri contains the following ordered data
                    iv: first 32 bytes
                    mac: last 16 bytes
                    ciphertext: remining bytes between
        payload containing contract terms
        Returns: dict, the unencrypted contents of the NFT URI
    '''
    print('decrypt', flush=True)
    node_key_bytes = base64.b64decode(node_key)
    access_key = decrypt_access_key(node_key_bytes)
    if type(access_key) is not bytes:
        return {'error': access_key}

    uri_bytes = base64.b64decode(uri)
    iv = uri_bytes[:32]
    ciphertext = uri_bytes[32:-16]
    mac = uri_bytes[-16:]

    aes_cipher = AES.new(access_key, AES.MODE_GCM, nonce=iv)
    uri = aes_cipher.decrypt_and_verify(ciphertext, mac).decode('utf-8')
    return json.loads(uri)


class Reencryption:
    ''' Simple wrapper Program class for re-encryption requests for Arbol NFT contracts. 
        Decrypts (encrypted) node key with private key and then re-encrypts with supplied public key
    '''
    _PROGRAM_PARAMETERS = ['node_key', "public_key"]


    @classmethod
    def validate_request(cls, params):
        ''' Asserts that the Chainlink request includes the necessary parameters to
            execute a contract re-encryption

            Parameters: params (dict), parameters to be checked against the
            requirements
            Returns: bool, whether the request format is valid
                     str, error message in the event that the request is not valid
        '''
        result = True
        result_msg = ""
        for param in cls._PROGRAM_PARAMETERS:
            if params.get(param, None) is None:
                result_msg += f'missing {param} parameter\n'
                result = False
        return result, result_msg

    @classmethod
    def serve_request(cls, params):
        ''' Encrypts the provided data with the given public key

            Parameters: params (dict), dictionary of required parameters
            Returns: string, the re-encrypted access key
        '''
        reencrypted_bytes = reencrypt(params["node_key"], params["public_key"])
        reencrypted_string = base64.b64encode(reencrypted_bytes)
        return reencrypted_string.decode()