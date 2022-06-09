import os
import json
import zlib
import base64
import ast
from nacl.public import PrivateKey, PublicKey, Box

PRIVATE_KEY = os.environ.get("NODE_PRIVATE_KEY")

def decrypt(uri, key=PRIVATE_KEY, section=2):
    ''' Decrypts the contents of the supplied NFT URI that are encrypted for 
        the Chainlink node and returns a JSON object

        Parameters: uri (string), base64 encoded NFT URI
        Parameters: key (string), Metamask public encryption key
        Parameters: section (number), the section of the URI to decrypt
                    the default 2 corresponds to the contents encrypted for
                    the Chainlink node. Section 0 corresponds to the contents
                    encrypted for the client/holder. Section 1 corresponds to
                    the contents encrypted for the associated Arbol representative
        Returns: dict, the unencrypted contents of the NFT URI
    '''
    bytes_data = base64.b64decode(uri)
    encrypted_bytes = zlib.decompress(bytes_data)
    encrypted_data = encrypted_bytes.decode()
    encrypted_payload = ast.literal_eval(encrypted_data)

    section_length = len(encrypted_payload) // 3
    client_section = encrypted_payload[:section_length]
    provider_section = encrypted_payload[section_length:2*section_length]
    node_section = encrypted_payload[-section_length:]
    sections = [client_section, provider_section, node_section]
    selected_encryption_payload = sections[section]

    nonce = base64.b64decode(selected_encryption_payload[0])
    ephemeral_public_key = base64.b64decode(selected_encryption_payload[1])
    cipher_text = base64.b64decode(selected_encryption_payload[2])

    secret_key_bytes = bytes.fromhex(key)

    secret_key = PrivateKey(secret_key_bytes)
    public_key = PublicKey(ephemeral_public_key)

    box = Box(secret_key, public_key)
    plaintext = box.decrypt(nonce + cipher_text).decode()
    data = json.loads(plaintext)
    return data


def reencrypt(uri, data, public_key, section=0):
    ''' Encrypts the given data with the given public encryption
        key and returns the encrypted string. Called in conjunction
        with decrypt() to re-encrypt NFT URIs after transfers

        Parameters: uri (string), full NFT URI
        Parameters: data (dict), unencrypted contract data in json format
        Parameters: public_key (string), public encryption key to be used for encryption
        Parameters: section (number), the section of the URI to reencrypt
                    the default 0 corresponds to the contents encrypted for
                    for the client/holder. Section 1 corresponds to the 
                    contents encrypted for the associated Arbol representative. 
                    Section 2 corresponds to the contents encrypted for the 
                    Chainlink node
        Returns: string, the encrypted NFT URI
    '''
    bytes_data = base64.b64decode(uri)
    encrypted_bytes = zlib.decompress(bytes_data)
    encrypted_data = encrypted_bytes.decode()
    encrypted_payload = ast.literal_eval(encrypted_data)

    public_key = PublicKey(base64.b64decode(public_key))
    ephemeral_secret_key = PrivateKey.generate()
    ephemeral_public_key = ephemeral_secret_key.public_key

    box = Box(ephemeral_secret_key, public_key)

    plaintext = json.dumps(data)
    plaintext_bytes = plaintext.encode()
    encrypted = box.encrypt(plaintext_bytes)

    nonce = base64.b64encode(encrypted.nonce).decode()
    ephemeral_public_key = base64.b64encode(ephemeral_public_key._public_key).decode()
    cipher_text = base64.b64encode(encrypted.ciphertext).decode()
    payload = [nonce, ephemeral_public_key, cipher_text]

    section_length = len(encrypted_payload) // 3
    client_section = encrypted_payload[:section_length]
    provider_section = encrypted_payload[section_length:2*section_length]
    node_section = encrypted_payload[-section_length:]
    sections = [client_section, provider_section, node_section]

    encryption = []
    for i in range(len(sections)):
        if i == section:
            encryption += payload
        else:
            encryption += sections[i]

    encryption_bytes = json.dumps(encryption).encode()
    compressed_encryption = zlib.compress(encryption_bytes)
    result = base64.b64encode(compressed_encryption).decode()
    return result


class Reencryption:
    ''' Simple wrapper Program class for re-encryption requests for Arbol NFT contracts. 
        Decrypts node section of NFT URI and encrypts contents with supplied
        public encryption key
    '''
    _PROGRAM_PARAMETERS = ['public_key', "unencrypted_data", "uri"]


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
            Returns: string, the re-encrypted NFT URI
        '''
        reencryption = reencrypt(params["uri"], params["unencrypted_data"], params["public_key"])
        return reencryption