# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: pogoprotos/networking/requests/messages/download_gm_templates_message.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
from google.protobuf import descriptor_pb2
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='pogoprotos/networking/requests/messages/download_gm_templates_message.proto',
  package='pogoprotos.networking.requests.messages',
  syntax='proto3',
  serialized_pb=_b('\nKpogoprotos/networking/requests/messages/download_gm_templates_message.proto\x12\'pogoprotos.networking.requests.messages\"\xaa\x01\n\x1a\x44ownloadGmTemplatesMessage\x12\x16\n\x0e\x62\x61sis_batch_id\x18\x01 \x01(\x03\x12\x10\n\x08\x62\x61tch_id\x18\x02 \x01(\x03\x12\x13\n\x0bpage_offset\x18\x03 \x01(\x05\x12\x19\n\x11\x61pply_experiments\x18\x04 \x01(\x08\x12\x1b\n\x13\x62\x61sis_experiment_id\x18\x05 \x03(\x05\x12\x15\n\rexperiment_id\x18\x06 \x03(\x05\x62\x06proto3')
)
_sym_db.RegisterFileDescriptor(DESCRIPTOR)




_DOWNLOADGMTEMPLATESMESSAGE = _descriptor.Descriptor(
  name='DownloadGmTemplatesMessage',
  full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='basis_batch_id', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.basis_batch_id', index=0,
      number=1, type=3, cpp_type=2, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='batch_id', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.batch_id', index=1,
      number=2, type=3, cpp_type=2, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='page_offset', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.page_offset', index=2,
      number=3, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='apply_experiments', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.apply_experiments', index=3,
      number=4, type=8, cpp_type=7, label=1,
      has_default_value=False, default_value=False,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='basis_experiment_id', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.basis_experiment_id', index=4,
      number=5, type=5, cpp_type=1, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='experiment_id', full_name='pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage.experiment_id', index=5,
      number=6, type=5, cpp_type=1, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=121,
  serialized_end=291,
)

DESCRIPTOR.message_types_by_name['DownloadGmTemplatesMessage'] = _DOWNLOADGMTEMPLATESMESSAGE

DownloadGmTemplatesMessage = _reflection.GeneratedProtocolMessageType('DownloadGmTemplatesMessage', (_message.Message,), dict(
  DESCRIPTOR = _DOWNLOADGMTEMPLATESMESSAGE,
  __module__ = 'pogoprotos.networking.requests.messages.download_gm_templates_message_pb2'
  # @@protoc_insertion_point(class_scope:pogoprotos.networking.requests.messages.DownloadGmTemplatesMessage)
  ))
_sym_db.RegisterMessage(DownloadGmTemplatesMessage)


# @@protoc_insertion_point(module_scope)