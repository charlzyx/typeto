type createPet = {
  method: "PUT";
  url: "{{SERVER}}/pet";
  resp: Resp<Pet> | Resp<Pet, "application/xml">;
};

// @deprecated in line
type deletePet = {
  method: "DELETE";
  url: "{{SERVER}}/pet/:petId";
  headers: {
    api_key: string;
  };
  path: {
    petId: Pet["id"];
  };
  resp: Reason<"Invalid pet value">;
};

/**
 * @deprecated in js doc
 */
type findPetByID = {
  method: "GET";
  url: "{{SERVER}}/:petId";
  path: {
    petId: Pet["id"];
  };
  resp:
    | Resp<Pet>
    | Resp<Pet, "application/xml">
    | Reason<"Invalid ID supplied">
    | Reason<"Pet not Found", 404>;
};

type findPetByStatus = {
  method: "GET";
  url: "{{SERVER}}/findByStatus";
  query: Pet["status"];
  resp:
    | Resp<Pet>
    | Resp<Pet, "application/xml">
    | Reason<"Invalid status value">;
};

type findPetByTags = {
  method: "GET";
  url: "{{SERVER}}/findByTags";
  query: Pet["tags"];
  resp:
    | Resp<Pet>
    | Resp<Pet, "application/xml">
    | Reason<"Invalid status value">;
};

type updatePet = {
  method: "POST";
  url: "{{SERVER}}/pet";
  body: OmitAndRequired<Pet, "id", "name" | "photoUrls">;
  resp:
    | Resp<Pet>
    | Resp<Pet, "application/xml">
    | Reason<"Pet not found", 401>
    | Reason<"Validation expection", 422>;
};

type updatePetWithForm = {
  method: "POST";
  url: "{{SERVER}}/pet/:petId";
  path: {
    petId: Pet["id"];
  };
  query: Pick<Pet, "name" | "status">;
  resp: Reason<"Invalid ID supplied">;
};

type updatePetImage = {
  method: "POST";
  url: "{{SERVER}}/pet/:petId/uploadImage";
  path: {
    petId: Pet["id"];
  };
  /**
   *  requestBody:
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
   */
  body: binary;
  query: Record<string, string>;
  resp: Resp<Pet> | Reason<"Pet not Found", 404>;
};

type placeOrder = {
  method: "POST";
  url: "{{SERVER}}/store/order";
  body: Order;
  resp:
    | Resp<Order>
    | Reason<"Invalid input">
    | Reason<"Validation exception", 422>;
};

type getOrderById = {
  method: "GET";
  url: "{{SERVER}}/store/order/:orderId";
  path: {
    orderId: Order["id"];
  };
  resp:
    | Resp<Order>
    | Resp<Order, "application/xml">
    | Reason<"Invalid ID supplied">
    | Reason<"Order not found", 404>;
};

type getInventory = {
  method: "GET";
  url: "{{SERVER}}/store/inventory";
  resp: Record<Pet["status"], int32>;
};

type deleteOrder = {
  method: "DELETE";
  url: "{{SERVER}}/store/order/:orderId";
  path: {
    orderId: Order["id"];
  };
  resp: Reason<"Invalid ID supplied"> | Reason<"Order not found", 404>;
};

type createUser = {
  method: "POST";
  url: "{{SERVER}}/user";
  body: OmitAndRequired<User, "id", "username" | "password">;
  resp: Resp<User> | Resp<User, "application/xml">;
};

type createUserList = {
  method: "POST";
  url: "{{SERVER}}/user/createWithList";
  body: OmitAndRequired<User, "id", "username" | "password">[];
  resp: Resp<User[]> | Resp<User[], "application/xml">;
};

type deleteUser = {
  method: "DELETE";
  url: "{{SERVER}}/user/:username";
  path: {
    username: User["username"];
  };
  resp: Reason<"INvalid username supplied"> | Reason<"User not found", 404>;
};

type getUserByName = {
  method: "GET";
  url: "{{SERVER}}/user/:username";
  path: {
    username: User["username"];
  };
  resp:
    | Resp<User>
    | Resp<User, "application/xml">
    | Reason<"INvalid username supplied">
    | Reason<"User not found", 404>;
};

type userLogin = {
  method: "GET";
  url: "{{SERVER}}/user/login";
  query: Pick<User, "username" | "password">;
  resp:
    | Resp<
        string,
        "application/json",
        200,
        {
          "X-Rate-Limit": string;
          "X-Expires-After": string;
        }
      >
    | Resp<
        string,
        "application/xml",
        200,
        {
          "X-Rate-Limit": string;
          "X-Expires-After": string;
        }
      >
    | Reason<"Invalid username/password supplied ">;
};

type userLogout = {
  method: "GET";
  url: "{{SERVER}}/user/logout";
  resp: Resp<string>;
};

type updateUser = {
  method: "PUT";
  url: "{{SERVER}}/user/:username";
  path: {
    username: User["username"];
  };
  resp:
    | Resp<string>
    | Reason<"INvalid username supplied">
    | Reason<"User not found", 404>;
};

type TreeLike<T> = {
  id: number;
  children: TreeLike<T>[];
};

type tryCircleRef = {
  url: "TEST";
  body: TreeLike<{ name: string }>;
};
type int32 = number;
type int64 = number;
type float = number;
type double = number;
type date = string;
type datetime = string;
type password = string;
type binary = string;
type byte = string;

type OmitAndRequired<
  T,
  OmitedProps extends keyof T,
  RquiredProps extends keyof T,
> = Omit<Partial<T>, OmitedProps> & Pick<T, RquiredProps>;

type OmitAndOptional<
  T,
  OmitedProps extends keyof T,
  OptionalProps extends keyof T,
> = Omit<Partial<T>, OmitedProps> & Partial<Pick<T, OptionalProps>>;

// https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers
type BuiltInHttpHeaders =
  | "Accept"
  | "Accept-CH"
  | "Accept-Charset"
  | "Accept-Encoding"
  | "Accept-Language"
  | "Accept-Patch"
  | "Accept-Post"
  | "Accept-Ranges"
  | "Access-Control-Allow-Credentials"
  | "Access-Control-Allow-Headers"
  | "Access-Control-Allow-Methods"
  | "Access-Control-Allow-Origin"
  | "Access-Control-Expose-Headers"
  | "Access-Control-Max-Age"
  | "Access-Control-Request-Headers"
  | "Access-Control-Request-Method"
  | "Age"
  | "Allow"
  | "Alt-Svc"
  | "Alt-Used"
  | "Authorization"
  | "Cache-Control"
  | "Clear-Site-Data"
  | "Connection"
  | "Content-Digest"
  | "Content-Disposition"
  | "Content-Encoding"
  | "Content-Language"
  | "Content-Length"
  | "Content-Location"
  | "Content-Range"
  | "Content-Security-Policy"
  | "Content-Security-Policy-Report-Only"
  | "Content-Type"
  | "Cookie"
  | "Cross-Origin-Embedder-Policy"
  | "Cross-Origin-Opener-Policy"
  | "Cross-Origin-Resource-Policy"
  | "Date"
  | "Device-Memory"
  | "ETag"
  | "Expect"
  | "Expires"
  | "Forwarded"
  | "From"
  | "Host"
  | "If-Match"
  | "If-Modified-Since"
  | "If-None-Match"
  | "If-Range"
  | "If-Unmodified-Since"
  | "Keep-Alive"
  | "Last-Modified"
  | "Link"
  | "Location"
  | "Max-Forwards"
  | "Origin"
  | "Permissions-Policy"
  | "Priority"
  | "Proxy-Authenticate"
  | "Proxy-Authorization"
  | "Range"
  | "Referer"
  | "Referrer-Policy"
  | "Refresh"
  | "Repr-Digest"
  | "Retry-After"
  | "Sec-Fetch-Dest"
  | "Sec-Fetch-Mode"
  | "Sec-Fetch-Site"
  | "Sec-Fetch-User"
  | "Sec-Purpose"
  | "Sec-WebSocket-Accept"
  | "Sec-WebSocket-Extensions"
  | "Sec-WebSocket-Key"
  | "Sec-WebSocket-Protocol"
  | "Sec-WebSocket-Version"
  | "Server"
  | "Server-Timing"
  | "Service-Worker-Navigation-Preload"
  | "Set-Cookie"
  | "SourceMap"
  | "Strict-Transport-Security"
  | "TE"
  | "Timing-Allow-Origin"
  | "Trailer"
  | "Transfer-Encoding"
  | "Upgrade"
  | "Upgrade-Insecure-Requests"
  | "User-Agent"
  | "Vary"
  | "Via"
  | "Want-Content-Digest"
  | "Want-Repr-Digest"
  | "WWW-Authenticate"
  | "X-Content-Type-Options"
  | (string & {});

// https://developer.mozilla.org/zh-CN/docs/Web/HTTP/MIME_types
// https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Methods/POST

type BuiltInContentType =
  | "application/json"
  | "multipart/form-data"
  | "text/plain"
  | "application/octet-stream"
  | "application/xml"
  | "application/x-www-form-urlencoded"
  | "application/pdf"
  | "application/zip"
  | "text/javascript"
  | "text/css"
  | "text/html"
  | "image/apng"
  | "image/avif"
  | "image/gif"
  | "image/jpeg"
  | "image/png"
  | "image/svg+xml"
  | "image/webp"
  | "audio/wave"
  | "audio/wav"
  | "audio/x-wav"
  | "audio/x-pn-wav"
  | "audio/webm"
  | "audio/ogg"
  | "video/webm"
  | "video/ogg"
  | "application/ogg"
  | "multipart/byteranges"
  | (string & {});
// https://editor-next.swagger.io/
type Status = "placed" | "approved" | "delivered";

class Order {
  id: int64;
  petId: int64;
  quantity: int32;
  shipDate: datetime;
  status: Status;
  complete: boolean;
}

class Customer {
  id: int64;
  username: string;
  address: Address;
}

class Address {
  street: string;
  city: string;
  state: string;
  zip: number;
}

class Category {
  id: int64;
  name: string;
}

class User {
  id: int64;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userStatus: int32;
}

class Tag {
  id: int64;
  name: string;
}

class Pet {
  /** Pet's id */
  id: int64 = 0;
  // getJsDocs() cannot see me
  category: Category; // but getLeadingCommentRanges/getTrailingCommentRanges can do it!
  // name with default
  name: string = "hi";
  /** photos */
  photoUrls: string[];
  tags: Tag[];
  status: Status;
}

@ignore
class Cannot {
  see: "ME";
  caseBy: "@ignore";
}
type Auth = {};

type PageQuery<T> = T & {
  pageNo: number;
  pageSize: number;
};

type PageResp<T> = {
  records: T[];
  total: number;
  pageNo?: number;
  pageSize?: number;
};

type Resp<
  T,
  ContentType extends BuiltInContentType = "application/json",
  HTTPStateCode = 200,
  Headers extends Partial<Record<BuiltInHttpHeaders, string>> = {},
> = {
  code: int32;
  data: T;
  message: string;
};

type Reason<
  T,
  HTTPStateCode = 400,
  Headers extends Partial<Record<BuiltInHttpHeaders, string>> = {},
> = {
  code: int32;
  reason: string;
};
